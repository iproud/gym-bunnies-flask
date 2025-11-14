document.addEventListener('DOMContentLoaded', () => {

    // --- Global State ---
    let currentWorkout = null;
    let equipmentList = [];

    // --- Tab-Switching Logic ---
    window.showTab = (tabName) => {
        // Hide all content
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.add('hidden');
        });
        // Deactivate all buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Show selected content
        document.getElementById(tabName).classList.remove('hidden');
        // Activate selected button
        document.querySelector(`.tab-btn[onclick="showTab('${tabName}')"]`).classList.add('active');

        // Load content for the active tab
        if (tabName === 'equipment') {
            loadEquipment();
        } else if (tabName === 'workout') {
            loadWorkoutTab();
        } else if (tabName === 'home') {
            loadDashboard();
        } else if (tabName === 'settings') {
            loadUserSettings();
        }
    };

    // --- Equipment Management ---
    const equipmentListEl = document.getElementById('equipment-list');
    const equipmentForm = document.getElementById('equipment-form');
    const equipmentFormTitle = document.getElementById('equipment-form-title');
    const equipmentIdField = document.getElementById('equipment-id');
    const clearFormBtn = document.getElementById('clear-form-btn');

    // --- Reset Equipment Form ---
    const resetEquipmentForm = () => {
        equipmentForm.reset();
        equipmentIdField.value = '';
        equipmentFormTitle.textContent = 'Add New Equipment';
    };

    clearFormBtn.addEventListener('click', resetEquipmentForm);

    // --- Load Equipment ---
    const loadEquipment = async () => {
        try {
            const response = await fetch('/api/equipment');
            if (!response.ok) throw new Error('Failed to fetch equipment');
            
            const equipment = await response.json();
            equipmentList = equipment;
            
            equipmentListEl.innerHTML = '';
            if (equipment.length === 0) {
                equipmentListEl.innerHTML = '<p class="text-gray-500">No equipment found. Add some!</p>';
                return;
            }

            equipment.forEach(eq => {
                const card = document.createElement('div');
                card.className = 'bg-white rounded-lg shadow p-4';
                
                const imgSrc = eq.image_base64 
                    ? `data:image/png;base64,${eq.image_base64}` 
                    : 'https://placehold.co/300x200/e2e8f0/cbd5e0?text=No+Image';

                card.innerHTML = `
                    <img src="${imgSrc}" alt="${eq.name}" class="w-full h-32 object-cover rounded-md mb-3">
                    <h4 class="text-lg font-semibold">${eq.name}</h4>
                    <p class="text-sm text-gray-600">${eq.type}</p>
                    <p class="text-sm text-gray-500 mb-2">${eq.description || ''}</p>
                    <span class="text-xs font-medium px-2 py-1 rounded-full ${eq.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}">
                        ${eq.is_active ? 'Active' : 'Inactive'}
                    </span>
                    <div class="mt-4 flex space-x-2">
                        <button class="edit-btn text-sm text-blue-600 hover:text-blue-800" data-id="${eq.id}">Edit</button>
                        <button class="delete-btn text-sm text-red-600 hover:text-red-800" data-id="${eq.id}">Delete</button>
                    </div>
                `;
                equipmentListEl.appendChild(card);
            });

            addDynamicEventListeners();

        } catch (error) {
            console.error('Error loading equipment:', error);
            equipmentListEl.innerHTML = '<p class="text-red-500">Error loading equipment.</p>';
        }
    };

    // --- Handle Equipment Form Submission ---
    equipmentForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const id = equipmentIdField.value;
        const formData = new FormData(equipmentForm);
        
        const url = id ? `/api/equipment/${id}` : '/api/equipment';
        const method = id ? 'PUT' : 'POST';

        try {
            const response = await fetch(url, {
                method: method,
                body: formData 
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.message || 'Failed to save equipment');
            }

            await response.json();
            resetEquipmentForm();
            loadEquipment();

        } catch (error) {
            console.error('Error saving equipment:', error);
            alert(`Error: ${error.message}`);
        }
    });

    // --- Add Listeners for Edit/Delete Buttons ---
    const addDynamicEventListeners = () => {
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.target.dataset.id;
                try {
                    const response = await fetch('/api/equipment');
                    if (!response.ok) throw new Error('Failed to fetch equipment data');
                    
                    const equipment = await response.json();
                    const eq = equipment.find(item => item.id == id);
                    
                    if (eq) {
                        equipmentFormTitle.textContent = `Edit ${eq.name}`;
                        equipmentIdField.value = eq.id;
                        document.getElementById('name').value = eq.name;
                        document.getElementById('type').value = eq.type;
                        document.getElementById('description').value = eq.description;
                        document.getElementById('is_active').checked = eq.is_active;
                    }
                } catch (error) {
                    console.error('Error fetching equipment for edit:', error);
                }
            });
        });

        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.target.dataset.id;
                if (!confirm('Are you sure you want to delete this item?')) {
                    return;
                }

                try {
                    const response = await fetch(`/api/equipment/${id}`, {
                        method: 'DELETE',
                    });

                    if (!response.ok) {
                        const err = await response.json();
                        throw new Error(err.message || 'Failed to delete equipment');
                    }
                    
                    loadEquipment();
                } catch (error) {
                    console.error('Error deleting equipment:', error);
                    alert(`Error: ${error.message}`);
                }
            });
        });
    };

    // --- Workout Management ---
    
    // Load workout tab
    const loadWorkoutTab = async () => {
        await loadEquipmentForWorkout();
        await checkActiveWorkout();
        await loadWorkoutHistory();
    };

    // Load equipment for workout dropdown
    const loadEquipmentForWorkout = async () => {
        try {
            const response = await fetch('/api/equipment');
            if (!response.ok) throw new Error('Failed to fetch equipment');
            
            const equipment = await response.json();
            const select = document.getElementById('workout-equipment');
            
            select.innerHTML = '<option value="">Choose equipment...</option>';
            equipment.forEach(eq => {
                const option = document.createElement('option');
                option.value = eq.id;
                option.textContent = `${eq.name} (${eq.type})`;
                select.appendChild(option);
            });
        } catch (error) {
            console.error('Error loading equipment for workout:', error);
        }
    };

    // Check for active workout
    const checkActiveWorkout = async () => {
        try {
            const response = await fetch('/api/workout/inprogress');
            if (!response.ok) throw new Error('Failed to check active workout');
            
            const workout = await response.json();
            
            if (workout) {
                currentWorkout = workout;
                showActiveWorkout(workout);
                await loadCurrentSets();
            } else {
                hideActiveWorkout();
            }
        } catch (error) {
            console.error('Error checking active workout:', error);
        }
    };

    // Show active workout UI
    const showActiveWorkout = (workout) => {
        document.getElementById('start-workout-section').classList.add('hidden');
        document.getElementById('active-workout-section').classList.remove('hidden');
        document.getElementById('set-recording-section').classList.remove('hidden');
        document.getElementById('current-sets-section').classList.remove('hidden');
        
        const workoutInfo = document.getElementById('active-workout-info');
        workoutInfo.innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                    <span class="font-medium">Equipment:</span> ${workout.equipment.name}
                </div>
                <div>
                    <span class="font-medium">Type:</span> ${workout.equipment.type}
                </div>
                <div>
                    <span class="font-medium">Started:</span> ${new Date(workout.started_at).toLocaleString()}
                </div>
            </div>
        `;
    };

    // Hide active workout UI
    const hideActiveWorkout = () => {
        document.getElementById('start-workout-section').classList.remove('hidden');
        document.getElementById('active-workout-section').classList.add('hidden');
        document.getElementById('set-recording-section').classList.add('hidden');
        document.getElementById('current-sets-section').classList.add('hidden');
        currentWorkout = null;
    };

    // Start new workout
    window.startWorkout = async () => {
        const equipmentId = document.getElementById('workout-equipment').value;
        
        if (!equipmentId) {
            alert('Please select equipment');
            return;
        }

        try {
            const response = await fetch('/api/workout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    equipment_id: parseInt(equipmentId)
                })
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || 'Failed to start workout');
            }

            const workout = await response.json();
            currentWorkout = workout;
            
            document.getElementById('workout-equipment').value = '';
            showActiveWorkout(workout);
            await loadCurrentSets();
            
        } catch (error) {
            console.error('Error starting workout:', error);
            alert(`Error: ${error.message}`);
        }
    };

    // Complete workout
    window.completeWorkout = async () => {
        if (!currentWorkout) return;

        try {
            const response = await fetch(`/api/workout/${currentWorkout.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    status: 'completed'
                })
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || 'Failed to complete workout');
            }

            hideActiveWorkout();
            await loadWorkoutHistory();
            
        } catch (error) {
            console.error('Error completing workout:', error);
            alert(`Error: ${error.message}`);
        }
    };

    // Abandon workout
    window.abandonWorkout = async () => {
        if (!currentWorkout) return;
        
        if (!confirm('Are you sure you want to abandon this workout?')) return;

        try {
            const response = await fetch(`/api/workout/${currentWorkout.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    status: 'abandoned'
                })
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || 'Failed to abandon workout');
            }

            hideActiveWorkout();
            await loadWorkoutHistory();
            
        } catch (error) {
            console.error('Error abandoning workout:', error);
            alert(`Error: ${error.message}`);
        }
    };

    // Load current sets for active workout
    const loadCurrentSets = async () => {
        if (!currentWorkout) return;

        try {
            const response = await fetch(`/api/workout/${currentWorkout.id}/sets`);
            if (!response.ok) throw new Error('Failed to load sets');
            
            const sets = await response.json();
            displayCurrentSets(sets);
            
        } catch (error) {
            console.error('Error loading current sets:', error);
        }
    };

    // Display current sets
    const displayCurrentSets = (sets) => {
        const container = document.getElementById('current-sets');
        
        if (sets.length === 0) {
            container.innerHTML = '<p class="text-gray-500">No sets recorded yet.</p>';
            return;
        }

        container.innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                ${sets.map(set => `
                    <div class="bg-white p-3 rounded border border-gray-200 flex justify-between items-center">
                        <div>
                            <span class="font-medium">Set ${set.set_num}:</span>
                            <span class="ml-2">${set.reps_dist} reps</span>
                            <span class="ml-2">${set.weight_time} kg</span>
                        </div>
                        <button onclick="deleteSet(${set.id})" class="text-red-600 hover:text-red-800">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                            </svg>
                        </button>
                    </div>
                `).join('')}
            </div>
        `;
    };

    // Delete set
    window.deleteSet = async (setId) => {
        if (!confirm('Delete this set?')) return;

        try {
            const response = await fetch(`/api/set/${setId}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || 'Failed to delete set');
            }

            await loadCurrentSets();
            
        } catch (error) {
            console.error('Error deleting set:', error);
            alert(`Error: ${error.message}`);
        }
    };

    // Handle set form submission
    const setForm = document.getElementById('set-form');
    if (setForm) {
        setForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            if (!currentWorkout) {
                alert('No active workout');
                return;
            }

            const reps = parseFloat(document.getElementById('set-reps').value);
            const weight = parseInt(document.getElementById('set-weight').value);
            const resistance = parseInt(document.getElementById('set-resistance').value) || 0;

            try {
                const response = await fetch('/api/set', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        workout_id: currentWorkout.id,
                        reps_dist: reps,
                        weight_time: weight,
                        resistance: resistance
                    })
                });

                if (!response.ok) {
                    const err = await response.json();
                    throw new Error(err.error || 'Failed to add set');
                }

                setForm.reset();
                await loadCurrentSets();
                
            } catch (error) {
                console.error('Error adding set:', error);
                alert(`Error: ${error.message}`);
            }
        });
    }

    // Load workout history
    const loadWorkoutHistory = async () => {
        try {
            const response = await fetch('/api/workouts');
            if (!response.ok) throw new Error('Failed to load workout history');
            
            const workouts = await response.json();
            displayWorkoutHistory(workouts);
            
        } catch (error) {
            console.error('Error loading workout history:', error);
        }
    };

    // Display workout history
    const displayWorkoutHistory = (workouts) => {
        const container = document.getElementById('workout-history');
        
        if (workouts.length === 0) {
            container.innerHTML = '<p class="text-gray-500">No workout history yet.</p>';
            return;
        }

        container.innerHTML = workouts.map(workout => `
            <div class="bg-white p-4 rounded-lg border border-gray-200">
                <div class="flex justify-between items-start">
                    <div>
                        <h4 class="font-semibold">${workout.equipment.name}</h4>
                        <p class="text-sm text-gray-600">${workout.equipment.type}</p>
                        <p class="text-sm text-gray-500">${new Date(workout.date).toLocaleDateString()}</p>
                    </div>
                    <div class="text-right">
                        <span class="px-2 py-1 text-xs rounded-full ${
                            workout.status === 'completed' ? 'bg-green-100 text-green-800' :
                            workout.status === 'in progress' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                        }">
                            ${workout.status}
                        </span>
                        <p class="text-sm text-gray-500 mt-1">${workout.sets_count} sets</p>
                        ${workout.max_weight > 0 ? `<p class="text-sm text-gray-500">Max: ${workout.max_weight}kg</p>` : ''}
                    </div>
                </div>
            </div>
        `).join('');
    };

    // --- Dashboard ---
    const loadDashboard = async () => {
        try {
            const response = await fetch('/api/workouts');
            if (!response.ok) throw new Error('Failed to load dashboard data');
            
            const workouts = await response.json();
            updateDashboardStats(workouts);
            displayRecentWorkouts(workouts);
            
        } catch (error) {
            console.error('Error loading dashboard:', error);
        }
    };

    const updateDashboardStats = (workouts) => {
        const totalWorkouts = workouts.length;
        const completedWorkouts = workouts.filter(w => w.status === 'completed');
        
        // This week's workouts (simple calculation)
        const today = new Date();
        const weekStart = new Date(today.setDate(today.getDate() - today.getDay()));
        const thisWeekWorkouts = completedWorkouts.filter(w => 
            new Date(w.date) >= weekStart
        ).length;

        document.getElementById('total-workouts').textContent = totalWorkouts;
        document.getElementById('week-workouts').textContent = thisWeekWorkouts;
        document.getElementById('streak-days').textContent = '0'; // TODO: Calculate streak
    };

    const displayRecentWorkouts = (workouts) => {
        const container = document.getElementById('recent-workouts');
        const recentWorkouts = workouts.slice(0, 5);
        
        if (recentWorkouts.length === 0) {
            container.innerHTML = '<p class="text-gray-500">No recent workouts.</p>';
            return;
        }

        container.innerHTML = recentWorkouts.map(workout => `
            <div class="bg-gray-50 p-3 rounded flex justify-between items-center">
                <div>
                    <span class="font-medium">${workout.equipment.name}</span>
                    <span class="text-gray-500 ml-2">${workout.sets_count} sets</span>
                </div>
                <span class="text-sm text-gray-500">${new Date(workout.date).toLocaleDateString()}</span>
            </div>
        `).join('');
    };

    // --- User Settings ---
    
    const loadUserSettings = async () => {
        await loadUserProfile();
        await loadUserPreferences();
    };

    const loadUserProfile = async () => {
        // For now, we'll use the user data from the template
        // In a real app, you might want to fetch fresh user data
        document.getElementById('profile-first-name').value = '{{ user.first_name }}';
        document.getElementById('profile-last-name').value = '{{ user.last_name }}';
        document.getElementById('profile-email').value = '{{ user.email }}';
    };

    const loadUserPreferences = async () => {
        try {
            const response = await fetch('/api/user/preferences');
            if (!response.ok) throw new Error('Failed to load preferences');
            
            const preferences = await response.json();
            
            document.getElementById('units').value = preferences.units || 'metric';
            document.getElementById('default-rest-time').value = preferences.default_rest_time || 60;
            document.getElementById('theme').value = preferences.theme || 'light';
            
        } catch (error) {
            console.error('Error loading preferences:', error);
        }
    };

    // Handle profile form submission
    const profileForm = document.getElementById('profile-form');
    if (profileForm) {
        profileForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const data = {
                first_name: document.getElementById('profile-first-name').value,
                last_name: document.getElementById('profile-last-name').value,
                email: document.getElementById('profile-email').value
            };

            try {
                const response = await fetch('/api/user', {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(data)
                });

                if (!response.ok) {
                    const err = await response.json();
                    throw new Error(err.error || 'Failed to update profile');
                }

                alert('Profile updated successfully!');
                
            } catch (error) {
                console.error('Error updating profile:', error);
                alert(`Error: ${error.message}`);
            }
        });
    }

    // Handle password form submission
    const passwordForm = document.getElementById('password-form');
    if (passwordForm) {
        passwordForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const currentPassword = document.getElementById('current-password').value;
            const newPassword = document.getElementById('new-password').value;
            const confirmPassword = document.getElementById('confirm-password').value;

            if (newPassword !== confirmPassword) {
                alert('New passwords do not match');
                return;
            }

            const data = {
                current_password: currentPassword,
                new_password: newPassword
            };

            try {
                const response = await fetch('/api/user', {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(data)
                });

                if (!response.ok) {
                    const err = await response.json();
                    throw new Error(err.error || 'Failed to update password');
                }

                alert('Password updated successfully!');
                passwordForm.reset();
                
            } catch (error) {
                console.error('Error updating password:', error);
                alert(`Error: ${error.message}`);
            }
        });
    }

    // Handle preferences form submission
    const preferencesForm = document.getElementById('preferences-form');
    if (preferencesForm) {
        preferencesForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const data = {
                units: document.getElementById('units').value,
                default_rest_time: parseInt(document.getElementById('default-rest-time').value),
                theme: document.getElementById('theme').value
            };

            try {
                const response = await fetch('/api/user/preferences', {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(data)
                });

                if (!response.ok) {
                    const err = await response.json();
                    throw new Error(err.error || 'Failed to update preferences');
                }

                alert('Preferences updated successfully!');
                
            } catch (error) {
                console.error('Error updating preferences:', error);
                alert(`Error: ${error.message}`);
            }
        });
    }

    // --- Initial Load ---
    showTab('home');
});
