document.addEventListener('DOMContentLoaded', () => {

    // --- Global State ---
    let currentWorkout = null;
    let equipmentList = [];
    let workoutFrequencyChart = null;
    let equipmentUsageChart = null;

    // --- Tab-Switching Logic ---
    window.showTab = (tabName) => {
        // Hide all panels
        document.querySelectorAll('.tab-panel').forEach(panel => {
            panel.classList.remove('active');
            panel.classList.add('hidden');
        });
        
        // Deactivate all buttons
        document.querySelectorAll('.tab-button').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Show selected panel
        const panel = document.getElementById(`${tabName}-panel`);
        if (panel) {
            panel.classList.remove('hidden');
            setTimeout(() => panel.classList.add('active'), 10);
        }
        
        // Activate selected button
        const button = document.querySelector(`.tab-button[data-tab="${tabName}"]`);
        if (button) {
            button.classList.add('active');
        }

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
                card.className = 'card equipment-card card-interactive';
                
                const imgSrc = eq.image_base64 
                    ? `data:image/png;base64,${eq.image_base64}` 
                    : 'https://placehold.co/300x200/e2e8f0/cbd5e0?text=No+Image';

                card.innerHTML = `
                    <img src="${imgSrc}" alt="${eq.name}" class="equipment-image">
                    <h4 class="equipment-name">${eq.name}</h4>
                    <p class="equipment-type">${eq.type}</p>
                    <p class="text-sm text-gray-500 mb-3">${eq.description || ''}</p>
                    <span class="badge ${eq.is_active ? 'badge-success' : 'badge-gray'}">
                        ${eq.is_active ? '✓ Active' : '○ Inactive'}
                    </span>
                    <div class="equipment-actions">
                        <button class="edit-btn btn btn-outline btn-sm" data-id="${eq.id}">
                            <span>✏️</span>
                            <span>Edit</span>
                        </button>
                        <button class="delete-btn btn btn-danger btn-sm" data-id="${eq.id}">
                            <span>🗑️</span>
                            <span>Delete</span>
                        </button>
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

        container.innerHTML = sets.map(set => `
            <div class="set-item">
                <div class="set-number">${set.set_num}</div>
                <div class="set-data">
                    <div class="set-value">
                        <span class="set-label">Reps</span>
                        <span class="set-number-value">${set.reps_dist}</span>
                    </div>
                    <div class="set-value">
                        <span class="set-label">Weight</span>
                        <span class="set-number-value">${set.weight_time}kg</span>
                    </div>
                    ${set.resistance > 0 ? `
                        <div class="set-value">
                            <span class="set-label">Resistance</span>
                            <span class="set-number-value">${set.resistance}</span>
                        </div>
                    ` : ''}
                </div>
                <button onclick="deleteSet(${set.id})" class="btn btn-ghost btn-sm">
                    <span>🗑️</span>
                </button>
            </div>
        `).join('');
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
            initializeCharts(workouts);
            
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

    // --- Chart Functions ---
    const createWorkoutFrequencyChart = (workouts) => {
        const ctx = document.getElementById('workout-frequency-chart');
        if (!ctx) return;

        // Generate last 12 weeks data
        const weeks = [];
        const workoutCounts = [];
        const today = new Date();
        
        for (let i = 11; i >= 0; i--) {
            const weekStart = new Date(today);
            weekStart.setDate(today.getDate() - (i * 7) - today.getDay());
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekStart.getDate() + 6);
            
            weeks.push(`Week ${12 - i}`);
            
            const weekWorkouts = workouts.filter(w => {
                const workoutDate = new Date(w.date);
                return workoutDate >= weekStart && workoutDate <= weekEnd;
            }).length;
            
            workoutCounts.push(weekWorkouts);
        }

        // Destroy existing chart if it exists
        if (workoutFrequencyChart) {
            workoutFrequencyChart.destroy();
        }

        workoutFrequencyChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: weeks,
                datasets: [{
                    label: 'Workouts',
                    data: workoutCounts,
                    borderColor: 'rgb(59, 130, 246)',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: 'rgb(59, 130, 246)',
                    pointBorderColor: 'white',
                    pointBorderWidth: 2,
                    pointRadius: 6,
                    pointHoverRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        padding: 12,
                        cornerRadius: 8,
                        titleFont: {
                            size: 14,
                            weight: '600'
                        },
                        bodyFont: {
                            size: 13
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1,
                            font: {
                                size: 12
                            }
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        }
                    },
                    x: {
                        ticks: {
                            font: {
                                size: 11
                            }
                        },
                        grid: {
                            display: false
                        }
                    }
                },
                interaction: {
                    intersect: false,
                    mode: 'index'
                }
            }
        });
    };

    const createEquipmentUsageChart = (workouts) => {
        const ctx = document.getElementById('equipment-usage-chart');
        if (!ctx) return;

        // Count equipment usage
        const equipmentCounts = {};
        workouts.forEach(workout => {
            const equipmentName = workout.equipment.name;
            equipmentCounts[equipmentName] = (equipmentCounts[equipmentName] || 0) + 1;
        });

        const labels = Object.keys(equipmentCounts);
        const data = Object.values(equipmentCounts);

        if (labels.length === 0) {
            return;
        }

        // Destroy existing chart if it exists
        if (equipmentUsageChart) {
            equipmentUsageChart.destroy();
        }

        equipmentUsageChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: [
                        'rgb(59, 130, 246)',
                        'rgb(147, 51, 234)',
                        'rgb(34, 197, 94)',
                        'rgb(251, 146, 60)',
                        'rgb(239, 68, 68)',
                        'rgb(236, 72, 153)',
                        'rgb(14, 165, 233)',
                        'rgb(168, 85, 247)'
                    ],
                    borderWidth: 2,
                    borderColor: 'white'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 15,
                            font: {
                                size: 12
                            },
                            usePointStyle: true
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        padding: 12,
                        cornerRadius: 8,
                        titleFont: {
                            size: 14,
                            weight: '600'
                        },
                        bodyFont: {
                            size: 13
                        }
                    }
                },
                cutout: '60%'
            }
        });
    };

    const initializeCharts = (workouts) => {
        // Update chart containers to remove loading/empty states
        const frequencyContainer = document.querySelector('.chart-container:nth-child(1) .chart-body');
        const usageContainer = document.querySelector('.chart-container:nth-child(2) .chart-body');
        
        if (frequencyContainer) {
            frequencyContainer.innerHTML = '<canvas id="workout-frequency-chart" height="300"></canvas>';
        }
        
        if (usageContainer) {
            if (workouts.length > 0) {
                usageContainer.innerHTML = '<canvas id="equipment-usage-chart" height="300"></canvas>';
                createEquipmentUsageChart(workouts);
            } else {
                usageContainer.innerHTML = `
                    <div class="chart-empty">
                        <div class="chart-empty-icon">📊</div>
                        <h4 class="chart-empty-title">No data yet</h4>
                        <p class="chart-empty-text">Start logging workouts to see your equipment usage patterns</p>
                    </div>
                `;
            }
        }
        
        // Create frequency chart
        createWorkoutFrequencyChart(workouts);
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
