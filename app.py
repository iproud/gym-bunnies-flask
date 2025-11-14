import os
import base64
from flask import Flask, render_template, request, redirect, url_for, session, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager, UserMixin, login_user, logout_user, login_required, current_user
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import date, datetime

# --- App Setup ---
app = Flask(__name__)
app.config['SECRET_KEY'] = 'a_very_secret_key_change_this'  # Change this to a random secret key
basedir = os.path.abspath(os.path.dirname(__file__))
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(basedir, 'gym_bunnies.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'  # Redirect to 'login' route if user is not authenticated

# --- Database Models ---

class User(UserMixin, db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(100), unique=True, nullable=False)
    password = db.Column(db.String(200), nullable=False)
    first_name = db.Column(db.String(100), nullable=False)
    last_name = db.Column(db.String(100), nullable=False)
    is_admin = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, server_default=db.func.now())
    workouts = db.relationship('Workout', backref='user', lazy=True)
    preferences = db.relationship('UserPreferences', backref='user', uselist=False, lazy=True)

    def set_password(self, password):
        self.password = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password, password)

class UserPreferences(db.Model):
    __tablename__ = 'user_preferences'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), unique=True, nullable=False)
    units = db.Column(db.String(10), default='metric')
    default_rest_time = db.Column(db.Integer, default=60)
    theme = db.Column(db.String(10), default='light')
    created_at = db.Column(db.DateTime, server_default=db.func.now())
    updated_at = db.Column(db.DateTime, server_default=db.func.now(), onupdate=db.func.now())

class GymEquipment(db.Model):
    __tablename__ = 'gym_equipment'
    id = db.Column(db.Integer, primary_key=True)
    type = db.Column(db.String(50), nullable=False)
    name = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=True)
    image_base64 = db.Column(db.Text, nullable=True)
    is_active = db.Column(db.Integer, default=1)
    created_at = db.Column(db.DateTime, server_default=db.func.now())
    workouts = db.relationship('Workout', backref='equipment', lazy=True)

    def to_dict(self):
        return {
            'id': self.id,
            'type': self.type,
            'name': self.name,
            'description': self.description,
            'image_base64': self.image_base64,
            'is_active': self.is_active,
        }

class Workout(db.Model):
    __tablename__ = 'workouts'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    equipment_id = db.Column(db.Integer, db.ForeignKey('gym_equipment.id'), nullable=False)
    date = db.Column(db.Date, nullable=False, default=date.today)
    status = db.Column(db.String(50), default='in progress')
    created_at = db.Column(db.DateTime, server_default=db.func.now())
    started_at = db.Column(db.DateTime, nullable=True)
    ended_at = db.Column(db.DateTime, nullable=True)
    sets = db.relationship('Set', backref='workout', lazy=True, cascade="all, delete-orphan")

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'equipment_id': self.equipment_id,
            'date': self.date.isoformat() if self.date else None,
            'status': self.status,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'started_at': self.started_at.isoformat() if self.started_at else None,
            'ended_at': self.ended_at.isoformat() if self.ended_at else None,
            'equipment': self.equipment.to_dict() if self.equipment else None,
            'sets_count': len(self.sets) if self.sets else 0
        }

class Set(db.Model):
    __tablename__ = 'sets'
    id = db.Column(db.Integer, primary_key=True)
    workout_id = db.Column(db.Integer, db.ForeignKey('workouts.id'), nullable=False)
    set_num = db.Column(db.Integer, nullable=False)
    reps_dist = db.Column(db.Float, nullable=False)
    weight_time = db.Column(db.Integer, nullable=False)
    resistance = db.Column(db.Integer, nullable=False)

    def to_dict(self):
        return {
            'id': self.id,
            'workout_id': self.workout_id,
            'set_num': self.set_num,
            'reps_dist': self.reps_dist,
            'weight_time': self.weight_time,
            'resistance': self.resistance
        }

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

# --- Authentication Routes ---

@app.route('/login', methods=['GET', 'POST'])
def login():
    if current_user.is_authenticated:
        return redirect(url_for('index'))
    
    if request.method == 'POST':
        email = request.form['email']
        password = request.form['password']
        user = User.query.filter_by(email=email).first()
        
        if user and user.check_password(password):
            login_user(user, remember=True)
            return redirect(url_for('index'))
        else:
            return render_template('login.html', error='Invalid email or password.')
    
    return render_template('login.html')

@app.route('/register', methods=['POST'])
def register():
    if current_user.is_authenticated:
        return redirect(url_for('index'))
        
    email = request.form['email']
    password = request.form['password']
    first_name = request.form['first_name']
    last_name = request.form['last_name']
    
    existing_user = User.query.filter_by(email=email).first()
    if existing_user:
        return render_template('login.html', error='Email already exists.')
        
    new_user = User(
        email=email, 
        first_name=first_name, 
        last_name=last_name
    )
    new_user.set_password(password)
    
    db.session.add(new_user)
    db.session.commit()
    
    # Create default preferences for new user
    preferences = UserPreferences(user_id=new_user.id)
    db.session.add(preferences)
    db.session.commit()
    
    login_user(new_user, remember=True)
    return redirect(url_for('index'))

@app.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('login'))

# --- Main Application Routes ---

@app.route('/')
@login_required
def index():
    return render_template('index.html', user=current_user)

# --- API Routes (to be called by JavaScript) ---

# == Equipment API ==

@app.route('/api/equipment', methods=['GET'])
@login_required
def get_all_equipment():
    equipment_list = GymEquipment.query.filter_by(is_active=1).all()
    return jsonify([eq.to_dict() for eq in equipment_list])

@app.route('/api/equipment', methods=['POST'])
@login_required
def create_equipment():
    data = request.form
    image_file = request.files.get('image')
    
    base64_data = None
    if image_file:
        image_data = image_file.read()
        base64_data = base64.b64encode(image_data).decode('utf-8')
    
    new_eq = GymEquipment(
        type=data['type'],
        name=data['name'],
        description=data.get('description'),
        is_active=1 if data.get('is_active') == 'on' else 0,
        image_base64=base64_data
    )
    db.session.add(new_eq)
    db.session.commit()
    return jsonify(new_eq.to_dict()), 201

@app.route('/api/equipment/<int:id>', methods=['PUT'])
@login_required
def update_equipment(id):
    eq = GymEquipment.query.get_or_404(id)
    data = request.form
    image_file = request.files.get('image')
    
    eq.type = data['type']
    eq.name = data['name']
    eq.description = data.get('description')
    eq.is_active = 1 if data.get('is_active') == 'on' else 0

    if image_file:
        image_data = image_file.read()
        eq.image_base64 = base64.b64encode(image_data).decode('utf-8')
    
    db.session.commit()
    return jsonify(eq.to_dict())

@app.route('/api/equipment/<int:id>', methods=['DELETE'])
@login_required
def delete_equipment(id):
    eq = GymEquipment.query.get_or_404(id)
    db.session.delete(eq)
    db.session.commit()
    return jsonify({'message': 'Equipment deleted'}), 200

# == Workout API ==

@app.route('/api/workouts', methods=['GET'])
@login_required
def get_workouts():
    workouts = db.session.query(
        Workout, GymEquipment, db.func.count(Set.id).label('sets_count'),
        db.func.max(Set.reps_dist).label('max_reps'),
        db.func.max(Set.weight_time).label('max_weight')
    ).join(GymEquipment).outerjoin(Set).filter(
        Workout.user_id == current_user.id
    ).group_by(Workout.id).all()
    
    result = []
    for workout, equipment, sets_count, max_reps, max_weight in workouts:
        workout_dict = workout.to_dict()
        workout_dict['sets_count'] = sets_count or 0
        workout_dict['max_reps'] = float(max_reps) if max_reps else 0
        workout_dict['max_weight'] = max_weight or 0
        result.append(workout_dict)
    
    return jsonify(result)

@app.route('/api/workout/inprogress', methods=['GET'])
@login_required
def get_inprogress_workout():
    workout = Workout.query.filter_by(
        user_id=current_user.id, 
        status='in progress'
    ).first()
    
    if workout:
        return jsonify(workout.to_dict())
    return jsonify(None)

@app.route('/api/workout', methods=['POST'])
@login_required
def create_workout():
    data = request.get_json()
    
    # Check if user already has an in-progress workout
    existing_workout = Workout.query.filter_by(
        user_id=current_user.id, 
        status='in progress'
    ).first()
    
    if existing_workout:
        return jsonify({'error': 'You already have an in-progress workout'}), 400
    
    if not data.get('equipment_id'):
        return jsonify({'error': 'Equipment ID is required'}), 400
    
    equipment = GymEquipment.query.get_or_404(data['equipment_id'])
    
    new_workout = Workout(
        user_id=current_user.id,
        equipment_id=data['equipment_id'],
        date=date.today(),
        status='in progress',
        started_at=datetime.utcnow()
    )
    
    db.session.add(new_workout)
    db.session.commit()
    
    return jsonify(new_workout.to_dict()), 201

@app.route('/api/workout/<int:id>', methods=['PUT'])
@login_required
def update_workout(id):
    workout = Workout.query.get_or_404(id)
    
    # Ensure user owns this workout
    if workout.user_id != current_user.id:
        return jsonify({'error': 'Unauthorized'}), 403
    
    data = request.get_json()
    
    if 'status' in data:
        workout.status = data['status']
        if data['status'] == 'completed':
            workout.ended_at = datetime.utcnow()
        elif data['status'] == 'abandoned':
            workout.ended_at = datetime.utcnow()
    
    db.session.commit()
    return jsonify(workout.to_dict())

@app.route('/api/workout/<int:id>', methods=['DELETE'])
@login_required
def delete_workout(id):
    workout = Workout.query.get_or_404(id)
    
    # Ensure user owns this workout
    if workout.user_id != current_user.id:
        return jsonify({'error': 'Unauthorized'}), 403
    
    db.session.delete(workout)
    db.session.commit()
    return jsonify({'message': 'Workout deleted'}), 200

# == Set API ==

@app.route('/api/workout/<int:workout_id>/sets', methods=['GET'])
@login_required
def get_sets(workout_id):
    workout = Workout.query.get_or_404(workout_id)
    
    # Ensure user owns this workout
    if workout.user_id != current_user.id:
        return jsonify({'error': 'Unauthorized'}), 403
    
    sets = Set.query.filter_by(workout_id=workout_id).order_by(Set.set_num).all()
    return jsonify([s.to_dict() for s in sets])

@app.route('/api/set', methods=['POST'])
@login_required
def create_set():
    data = request.get_json()
    
    if not data.get('workout_id'):
        return jsonify({'error': 'Workout ID is required'}), 400
    
    workout = Workout.query.get_or_404(data['workout_id'])
    
    # Ensure user owns this workout and it's in progress
    if workout.user_id != current_user.id or workout.status != 'in progress':
        return jsonify({'error': 'Cannot add sets to this workout'}), 400
    
    # Get next set number
    last_set = Set.query.filter_by(workout_id=data['workout_id']).order_by(Set.set_num.desc()).first()
    next_set_num = (last_set.set_num + 1) if last_set else 1
    
    new_set = Set(
        workout_id=data['workout_id'],
        set_num=next_set_num,
        reps_dist=data.get('reps_dist', 0),
        weight_time=data.get('weight_time', 0),
        resistance=data.get('resistance', 0)
    )
    
    db.session.add(new_set)
    db.session.commit()
    
    return jsonify(new_set.to_dict()), 201

@app.route('/api/set/<int:id>', methods=['PUT'])
@login_required
def update_set(id):
    set_obj = Set.query.get_or_404(id)
    workout = set_obj.workout
    
    # Ensure user owns this workout
    if workout.user_id != current_user.id:
        return jsonify({'error': 'Unauthorized'}), 403
    
    data = request.get_json()
    
    if 'reps_dist' in data:
        set_obj.reps_dist = data['reps_dist']
    if 'weight_time' in data:
        set_obj.weight_time = data['weight_time']
    if 'resistance' in data:
        set_obj.resistance = data['resistance']
    
    db.session.commit()
    return jsonify(set_obj.to_dict())

@app.route('/api/set/<int:id>', methods=['DELETE'])
@login_required
def delete_set(id):
    set_obj = Set.query.get_or_404(id)
    workout = set_obj.workout
    
    # Ensure user owns this workout
    if workout.user_id != current_user.id:
        return jsonify({'error': 'Unauthorized'}), 403
    
    db.session.delete(set_obj)
    db.session.commit()
    return jsonify({'message': 'Set deleted'}), 200

# == User API ==

@app.route('/api/user', methods=['PUT'])
@login_required
def update_user():
    data = request.get_json()
    
    if 'email' in data:
        # Check if email is already taken by another user
        existing_user = User.query.filter_by(email=data['email']).first()
        if existing_user and existing_user.id != current_user.id:
            return jsonify({'error': 'Email already exists'}), 400
        
        current_user.email = data['email']
    
    if 'first_name' in data:
        current_user.first_name = data['first_name']
    
    if 'last_name' in data:
        current_user.last_name = data['last_name']
    
    if 'current_password' in data and 'new_password' in data:
        if not current_user.check_password(data['current_password']):
            return jsonify({'error': 'Current password is incorrect'}), 400
        
        current_user.set_password(data['new_password'])
    
    db.session.commit()
    
    return jsonify({
        'id': current_user.id,
        'email': current_user.email,
        'first_name': current_user.first_name,
        'last_name': current_user.last_name
    })

@app.route('/api/user/preferences', methods=['GET'])
@login_required
def get_user_preferences():
    preferences = current_user.preferences
    if not preferences:
        preferences = UserPreferences(user_id=current_user.id)
        db.session.add(preferences)
        db.session.commit()
    
    return jsonify({
        'units': preferences.units,
        'default_rest_time': preferences.default_rest_time,
        'theme': preferences.theme
    })

@app.route('/api/user/preferences', methods=['PUT'])
@login_required
def update_user_preferences():
    data = request.get_json()
    preferences = current_user.preferences
    
    if not preferences:
        preferences = UserPreferences(user_id=current_user.id)
        db.session.add(preferences)
    
    if 'units' in data:
        preferences.units = data['units']
    if 'default_rest_time' in data:
        preferences.default_rest_time = data['default_rest_time']
    if 'theme' in data:
        preferences.theme = data['theme']
    
    preferences.updated_at = datetime.utcnow()
    db.session.commit()
    
    return jsonify({
        'units': preferences.units,
        'default_rest_time': preferences.default_rest_time,
        'theme': preferences.theme
    })

# --- Run the App ---
if __name__ == '__main__':
    app.run(debug=True)
