// Login Form
const loginForm = document.getElementById("loginForm");
    if (loginForm) {
        loginForm.addEventListener('submit', async function (event) {
            event.preventDefault();

            const form = event.target;
            const formData = new FormData(form);

            const payload = new URLSearchParams();
            for (const [key, value] of formData.entries()) {
                payload.append(key, value);
            }

            try {
                const response = await fetch('/auth/token', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    },
                    body: payload.toString()
                });

                if (response.ok) {
                    // Handle success (e.g., redirect to dashboard)
                    const data = await response.json();
                    // Delete any cookies available
                    logout();
                    // Save token to cookie
                    document.cookie = `access_token=${data.access_token}; path=/`;
                    window.location.href = '/bookings/bookings-page'; // Change this to your desired redirect page
                } else {
                    // Handle error
                    const errorData = await response.json();
                    alert(`Error: ${errorData.detail}`);
                }
            } catch (error) {
                console.error('Error:', error);
                alert('An error occurred. Please try again.');
            }
        });
    }

const registerForm = document.getElementById('registerForm');
if (registerForm) {
    registerForm.addEventListener('submit', function(event) {
        event.preventDefault();
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        const errorDiv = document.getElementById('error');
        
        if (password !== confirmPassword) {
            errorDiv.textContent = 'Passwords do not match!';
            return;
        }

        // Collect form data
        const userData = {
            email: document.getElementById('email').value,
            username: document.getElementById('username').value,
            firstName: document.getElementById('firstName').value,
            lastName: document.getElementById('lastName').value,
            role: document.getElementById('role').value,
            apartmentNumber: document.getElementById('apartmentNumber').value,
            phoneNumber: document.getElementById('phoneNumber').value,
            password: password
        };

        console.log('User Registered:', userData);
        alert('Registration successful!');
    });
}

function logout() {
    // Get all cookies
    const cookies = document.cookie.split(";");

    // Iterate through all cookies and delete each one
    for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i];
        const eqPos = cookie.indexOf("=");
        const name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
        // Set the cookie's expiry date to a past date to delete it
        document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
    }

    // Redirect to the login page
    window.location.href = '/auth/login-page';
};

// Make the entire "Select a Date" box clickable
document.addEventListener("DOMContentLoaded", function () {
    const datePickerContainer = document.getElementById("datePickerContainer");
    if (datePickerContainer) {
        datePickerContainer.addEventListener("click", function() {
            document.getElementById("datePicker").showPicker(); 
        });
    }
});

// Intl.DateTimeFormat takes care of the timezone and the daylight change
const formatter = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric', month: '2-digit', day: '2-digit'
});

// Date picker
document.addEventListener("DOMContentLoaded", function () {
    const datePicker = document.getElementById("datePicker");
    if (!datePicker) return;
    const today = new Date();
    const one_week_later = new Date();
    let user_selected_date = formatter.format(today); // yyyy-MM-dd format accepted by the browser. user_selected_date is initiated as current date.
    one_week_later_formatted = formatter.format(
        one_week_later.setDate(
            today.getDate() + 6
        ))
    
    datePicker.value = user_selected_date;
    datePicker.min = formatter.format(today);
    datePicker.max = one_week_later_formatted;
    // Log the initial value on page load
    console.log("Initial date on page load:", user_selected_date);

    // User changes the date
    datePicker.addEventListener("change", function () {
        user_selected_date = datePicker.value;
        console.log("User's selected date:", user_selected_date);
    });
});

// Function to Retrieve Token from Cookies
function getToken() {
    const cookies = document.cookie.split('; ');
    for (let cookie of cookies) {
        if (cookie.startsWith('access_token=')) {
            return cookie.split('=')[1];
        }
    }
    return null;
}

// Show startTimePicker dropdown on click
document.addEventListener("DOMContentLoaded", function () {
    const startTimePicker = document.getElementById("startTimePicker");
    const startTimeMenu = document.getElementById("startTimeMenu");
    const datePicker = document.getElementById("datePicker"); // The selected date input
    const endTimePicker = document.getElementById("endTimePicker");
    const endTimeMenu = document.getElementById("endTimeMenu");

    if (startTimePicker && startTimeMenu) {
        startTimePicker.addEventListener("click", async () => {
            startTimeMenu.style.display = "block";
            console.log("startTimeMenu clicked...");

            // Get the selected date from the date picker
            const selectedDate = datePicker.value;
            if (!selectedDate) {
                alert("Please select a date first.");
                return;
            }

            // Fetch available start times from backend
            try {
                const response = await fetch("/bookings/populate-start-times", {
                    method: "POST",
                    headers: { 
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${getToken()}`
                    },
                    body: JSON.stringify({ date: selectedDate }),
                    //credentials: 'include'
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }

                const data = await response.json();
                console.log("Available start times:", data.available_start_times);

                // let me convert the times to AM, PM here.    
                console.log("******", data.available_start_times[63])

                populateStartTimeMenu(data.available_start_times);
            } catch (error) {
                console.error("Error fetching start times:", error);
                alert("Error fetching available start times.");
            }
        });
    }

    // Function to populate the dropdown with available times
    function populateStartTimeMenu(availableTimes) {
        startTimeMenu.innerHTML = ""; // Clear existing options

        if (availableTimes.length === 0) {
            startTimeMenu.innerHTML = "<div>No available times</div>";
            return;
        }

        availableTimes.forEach(time => {
            const timeOption = document.createElement("div");
            timeOption.textContent = time;
            timeOption.addEventListener("click", () => {
                startTimePicker.value = time; // Set the selected time in the input box
                endTimePicker.value = "";
                endTimeMenu.innerHTML = "";
                endTimeMenu.style.display = "none"; // Hide dropdown
                startTimeMenu.style.display = "none"; // Hide dropdown
            });

            startTimeMenu.appendChild(timeOption);
        });
    }

    // Hide the dropdown when clicking outside
    document.addEventListener("click", (event) => {
        if (!startTimePicker) return;
        if (!startTimePicker.contains(event.target) && !startTimeMenu.contains(event.target)) {
            startTimeMenu.style.display = "none";
        }
    });
});

// Show endTimePicker dropdown on click
document.addEventListener("DOMContentLoaded", function () {
    const startTimePicker = document.getElementById("startTimePicker");
    const endTimePicker = document.getElementById("endTimePicker");
    const endTimeMenu = document.getElementById("endTimeMenu");
    const datePicker = document.getElementById("datePicker"); // The selected date input

    if (endTimePicker && endTimeMenu) {
        endTimePicker.addEventListener("click", async () => {
            endTimeMenu.style.display = "block";
            console.log("endTimeMenu clicked...");

            // Get the selected date from the date picker
            const selectedDate = datePicker.value;
            if (!selectedDate) {
                alert("Please select a date first.");
                return;
            }

            // Get the selected start time from the start time picker
            const startTime = startTimePicker.value;
            console.log("startTime value is:", startTime)
            if (!startTime) {
                alert("Please select a start time first.");
                return;
            }

            // Fetch available end times from backend
            try {
                const response = await fetch("/bookings/populate-end-times", {
                    method: "POST",
                    headers: { 
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${getToken()}`
                    },
                    body: JSON.stringify({ 
                        date: selectedDate,
                        start_time: startTime
                    }),
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }

                const data = await response.json();
                console.log("Available end times:", data.available_end_times);

                // let me convert the times to AM, PM here.    
                console.log("******", data.available_end_times[63])

                populateEndTimeMenu(data.available_end_times);
            } catch (error) {
                console.error("Error fetching start times:", error);
                alert("Error fetching available start times.");
            }
        });
    }

    // Function to populate the dropdown with available times
    function populateEndTimeMenu(availableTimes) {
        endTimeMenu.innerHTML = ""; // Clear existing options

        if (availableTimes.length === 0) {
            startTimeMenu.innerHTML = "<div>No available times</div>";
            return;
        }

        availableTimes.forEach(time => {
            const timeOption = document.createElement("div");
            timeOption.textContent = time;
            timeOption.addEventListener("click", () => {
                endTimePicker.value = time; // Set the selected time in the input box
                endTimeMenu.style.display = "none"; // Hide dropdown
            });

            endTimeMenu.appendChild(timeOption);
        });
    }

    // Hide the dropdown when clicking outside
    document.addEventListener("click", (event) => {
        if (!endTimePicker) return;
        if (!endTimePicker.contains(event.target) && !endTimeMenu.contains(event.target)) {
            endTimeMenu.style.display = "none";
        }
    });
});