document.addEventListener('DOMContentLoaded', () => {

    // --- Global State ---
    let currentWorkout = null;
    let equipmentList = [];
    let workoutFrequencyChart = null;
    let equipmentUsageChart = null;

    // --- Page Navigation ---
    const pages = document.querySelectorAll('.page');
    const navLinks = document.querySelectorAll('aside nav a');
    const pageTitle = document.getElementById('page-title');

    window.showPage = function(pageId) {
        const tabName = pageId.split('-')[0];
        pages.forEach(page => {
            page.classList.add('hidden');
        });
        document.getElementById(pageId).classList.remove('hidden');

        navLinks.forEach(link => {
            link.classList.remove('bg-gray-200');
            if (link.id === `nav-${tabName}`) {
                link.classList.add('bg-gray-200');
            }
        });

        pageTitle.textContent = tabName.charAt(0).toUpperCase() + tabName.slice(1);
        loadPageContent(tabName);
    }

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const pageId = `${link.dataset.tab}-panel`;
            showPage(pageId);
        });
    });

    function loadPageContent(pageName) {
        if (pageName === 'equipment') {
            loadEquipment();
        } else if (pageName === 'workout') {
            loadWorkoutTab();
        } else if (pageName === 'home') {
            loadDashboard();
        } else if (pageName === 'settings') {
            loadUserSettings();
        }
    }

    // Mobile menu toggle
    const menuButton = document.getElementById('menu-button');
    const sidebar = document.querySelector('aside');
    menuButton.addEventListener('click', () => {
        sidebar.classList.toggle('hidden');
    });

    // --- Equipment Management ---
    const equipmentListEl = document.getElementById('equipment-list');
    const equipmentForm = document.getElementById('equipment-form');
    const equipmentFormTitle = document.getElementById('equipment-form-title');
    const equipmentIdField = document.getElementById('equipment-id');
    const clearFormBtn = document.getElementById('clear-form-btn');

    const resetEquipmentForm = () => {
        equipmentForm.reset();
        equipmentIdField.value = '';
        equipmentFormTitle.textContent = 'Add New Equipment';
    };

    if(clearFormBtn) clearFormBtn.addEventListener('click', resetEquipmentForm);

    const loadEquipment = async () => {
        try {
            const response = await fetch('/api/equipment');
            if (!response.ok) throw new Error('Failed to fetch equipment');
            
            const equipment = await response.json();
            equipmentList = equipment;
            
            if(equipmentListEl) {
                equipmentListEl.innerHTML = '';
                if (equipment.length === 0) {
                    equipmentListEl.innerHTML = '<p class="text-gray-500">No equipment found. Add some!</p>';
                    return;
                }

                equipment.forEach(eq => {
                    const card = document.createElement('div');
                    card.className = 'bg-white p-4 rounded-lg shadow-md';

                    const imgSrc = eq.image_base64
                        ? `data:image/png;base64,${eq.image_base64}`
                        : 'https://placehold.co/300x200/e2e8f0/cbd5e0?text=No+Image';

                    card.innerHTML = `
                        <img src="${imgSrc}" alt="${eq.name}" class="w-full h-32 object-cover rounded-md mb-4">
                        <h4 class="text-lg font-semibold">${eq.name}</h4>
                        <p class="text-gray-600">${eq.type}</p>
                        <p class="text-sm text-gray-500 my-2">${eq.description || ''}</p>
                        <span class="px-2 py-1 text-xs rounded-full ${eq.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}">
                            ${eq.is_active ? 'Active' : 'Inactive'}
                        </span>
                        <div class="mt-4 flex space-x-2">
                            <button class="edit-btn px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600" data-id="${eq.id}">Edit</button>
                            <button class="delete-btn px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600" data-id="${eq.id}">Delete</button>
                        </div>
                    `;
                    equipmentListEl.appendChild(card);
                });

                addDynamicEventListeners();
            }

        } catch (error) {
            console.error('Error loading equipment:', error);
            if(equipmentListEl) equipmentListEl.innerHTML = '<p class="text-red-500">Error loading equipment.</p>';
        }
    };

    if(equipmentForm) {
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
    }

    const addDynamicEventListeners = () => {
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.target.closest('button').dataset.id;
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
                const id = e.target.closest('button').dataset.id;
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
    
    const loadWorkoutTab = async () => {
        await loadEquipmentForWorkout();
        await checkActiveWorkout();
        await loadWorkoutHistory();
    };

    const loadEquipmentForWorkout = async () => {
        try {
            const response = await fetch('/api/equipment');
            if (!response.ok) throw new Error('Failed to fetch equipment');
            
            const equipment = await response.json();
            const select = document.getElementById('workout-equipment');
            if(select) {
                select.innerHTML = '<option value="">Choose equipment...</option>';
                equipment.forEach(eq => {
                    const option = document.createElement('option');
                    option.value = eq.id;
                    option.textContent = `${eq.name} (${eq.type})`;
                    select.appendChild(option);
                });
            }
        } catch (error) {
            console.error('Error loading equipment for workout:', error);
        }
    };

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

    const showActiveWorkout = (workout) => {
        document.getElementById('start-workout-section').classList.add('hidden');
        document.getElementById('active-workout-section').classList.remove('hidden');
        document.getElementById('set-recording-section').classList.remove('hidden');
        document.getElementById('current-sets-section').classList.remove('hidden');
        
        const workoutInfo = document.getElementById('active-workout-section');
        if(workoutInfo) {
            workoutInfo.innerHTML = `
                <div class="bg-blue-100 p-6 rounded-lg shadow-md">
                    <h3 class="text-xl font-semibold mb-4 text-blue-800">Active Workout</h3>
                    <p><strong>Equipment:</strong> ${workout.equipment.name}</p>
                    <p><strong>Started:</strong> ${new Date(workout.started_at).toLocaleString()}</p>
                    <div class="mt-4 flex space-x-2">
                        <button onclick="completeWorkout()" class="px-6 py-3 bg-green-500 text-white rounded-md hover:bg-green-600">Complete</button>
                        <button onclick="abandonWorkout()" class="px-6 py-3 bg-red-500 text-white rounded-md hover:bg-red-600">Abandon</button>
                    </div>
                </div>
            `;
        }
    };

    const hideActiveWorkout = () => {
        document.getElementById('start-workout-section').classList.remove('hidden');
        document.getElementById('active-workout-section').classList.add('hidden');
        document.getElementById('set-recording-section').classList.add('hidden');
        document.getElementById('current-sets-section').classList.add('hidden');
        currentWorkout = null;
    };

    window.startWorkout = async () => {
        const equipmentId = document.getElementById('workout-equipment').value;
        if (!equipmentId) {
            alert('Please select equipment');
            return;
        }
        try {
            const response = await fetch('/api/workout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ equipment_id: parseInt(equipmentId) })
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

    window.completeWorkout = async () => {
        if (!currentWorkout) return;
        try {
            const response = await fetch(`/api/workout/${currentWorkout.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'completed' })
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

    window.abandonWorkout = async () => {
        if (!currentWorkout) return;
        if (!confirm('Are you sure you want to abandon this workout?')) return;
        try {
            const response = await fetch(`/api/workout/${currentWorkout.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'abandoned' })
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

    const displayCurrentSets = (sets) => {
        const container = document.getElementById('current-sets');
        if(container) {
            if (sets.length === 0) {
                container.innerHTML = '<p class="text-gray-500">No sets recorded yet.</p>';
                return;
            }
            container.innerHTML = sets.map(set => `
                <div class="flex justify-between items-center bg-gray-50 p-3 rounded-md">
                    <div>
                        <span class="font-semibold">Set ${set.set_num}:</span>
                        <span class="ml-4">${set.reps_dist} reps at ${set.weight_time} kg</span>
                    </div>
                    <button onclick="deleteSet(${set.id})" class="text-red-500 hover:text-red-700">Delete</button>
                </div>
            `).join('');
        }
    };

    window.deleteSet = async (setId) => {
        if (!confirm('Delete this set?')) return;
        try {
            const response = await fetch(`/api/set/${setId}`, { method: 'DELETE' });
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
                    headers: { 'Content-Type': 'application/json' },
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

    const displayWorkoutHistory = (workouts) => {
        const container = document.getElementById('workout-history');
        if(container) {
            if (workouts.length === 0) {
                container.innerHTML = '<p class="text-gray-500">No workout history yet.</p>';
                return;
            }
            container.innerHTML = workouts.map(workout => `
                <div class="bg-white p-4 rounded-lg shadow-md mb-4">
                    <div class="flex justify-between items-start">
                        <div>
                            <h4 class="font-semibold">${workout.equipment.name}</h4>
                            <p class="text-sm text-gray-600">${new Date(workout.date).toLocaleDateString()}</p>
                        </div>
                        <span class="px-2 py-1 text-xs rounded-full ${workout.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">${workout.status}</span>
                    </div>
                </div>
            `).join('');
        }
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
        const totalWorkoutsEl = document.getElementById('total-workouts');
        const weekWorkoutsEl = document.getElementById('week-workouts');
        const streakDaysEl = document.getElementById('streak-days');

        if(totalWorkoutsEl) totalWorkoutsEl.textContent = workouts.length;
        
        const today = new Date();
        const weekStart = new Date(today.setDate(today.getDate() - today.getDay()));
        const thisWeekWorkouts = workouts.filter(w => new Date(w.date) >= weekStart).length;
        if(weekWorkoutsEl) weekWorkoutsEl.textContent = thisWeekWorkouts;

        if(streakDaysEl) streakDaysEl.textContent = '0'; // Placeholder
    };

    const displayRecentWorkouts = (workouts) => {
        const container = document.getElementById('recent-workouts');
        if(container) {
            const recentWorkouts = workouts.slice(0, 5);
            if (recentWorkouts.length === 0) {
                container.innerHTML = '<p class="text-gray-500">No recent workouts.</p>';
                return;
            }
            container.innerHTML = recentWorkouts.map(workout => `
                <div class="flex justify-between items-center bg-gray-50 p-3 rounded-md">
                    <p class="font-semibold">${workout.equipment.name}</p>
                    <p class="text-sm text-gray-500">${new Date(workout.date).toLocaleDateString()}</p>
                </div>
            `).join('');
        }
    };

    const initializeCharts = (workouts) => {
        createWorkoutFrequencyChart(workouts);
        createEquipmentUsageChart(workouts);
    };

    const createWorkoutFrequencyChart = (workouts) => {
        const ctx = document.getElementById('workout-frequency-chart');
        if (!ctx) return;

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

        if (workoutFrequencyChart) workoutFrequencyChart.destroy();
        workoutFrequencyChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: weeks,
                datasets: [{
                    label: 'Workouts',
                    data: workoutCounts,
                    borderColor: 'rgb(59, 130, 246)',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    fill: true,
                }]
            },
            options: { responsive: true }
        });
    };

    const createEquipmentUsageChart = (workouts) => {
        const ctx = document.getElementById('equipment-usage-chart');
        if (!ctx) return;

        const equipmentCounts = {};
        workouts.forEach(workout => {
            const name = workout.equipment.name;
            equipmentCounts[name] = (equipmentCounts[name] || 0) + 1;
        });

        const labels = Object.keys(equipmentCounts);
        const data = Object.values(equipmentCounts);

        if (equipmentUsageChart) equipmentUsageChart.destroy();
        equipmentUsageChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444'],
                }]
            },
            options: { responsive: true }
        });
    };

    // --- User Settings ---
    const loadUserSettings = async () => {
        await loadUserProfile();
        await loadUserPreferences();
    };

    const loadUserProfile = async () => {
        const firstNameEl = document.getElementById('profile-first-name');
        const lastNameEl = document.getElementById('profile-last-name');
        const emailEl = document.getElementById('profile-email');

        if(firstNameEl) firstNameEl.value = '{{ user.first_name }}';
        if(lastNameEl) lastNameEl.value = '{{ user.last_name }}';
        if(emailEl) emailEl.value = '{{ user.email }}';
    };

    const loadUserPreferences = async () => {
        try {
            const response = await fetch('/api/user/preferences');
            if (!response.ok) throw new Error('Failed to load preferences');
            const preferences = await response.json();
            const unitsEl = document.getElementById('units');
            const restTimeEl = document.getElementById('default-rest-time');
            const themeEl = document.getElementById('theme');
            if(unitsEl) unitsEl.value = preferences.units || 'metric';
            if(restTimeEl) restTimeEl.value = preferences.default_rest_time || 60;
            if(themeEl) themeEl.value = preferences.theme || 'light';
        } catch (error) {
            console.error('Error loading preferences:', error);
        }
    };

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
                    headers: { 'Content-Type': 'application/json' },
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
                    headers: { 'Content-Type': 'application/json' },
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
                    headers: { 'Content-Type': 'application/json' },
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
    showPage('home-panel');
});
