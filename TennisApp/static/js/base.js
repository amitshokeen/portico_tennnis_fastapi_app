// Login Form
const loginForm = document.getElementById("loginForm");
const usernameInput = document.getElementById("username");

if (loginForm) {
    loginForm.addEventListener('submit', async function (event) {
        event.preventDefault();

        const form = event.target;
        const formData = new FormData(form);

        // I want to keep all username values as case-insensitive.
        formData.set('username', formData.get('username').toLowerCase());

        const payload = new URLSearchParams();
        for (const [key, value] of formData.entries()) {
            payload.append(key, value);
        }

        showLoading();  // Show spinner before the request
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
        } finally {
            hideLoading(); // Hide spinner after fetch completes
        }
    });
}

// Logout form
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

            showLoading();  // Show spinner before the request
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
                // alert("Error fetching available start times.");
                window.location.href = '/auth/login-page';
            } finally {
                hideLoading();  // Hide spinner after fetch completes
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

            showLoading();  // Show spinner before the request
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
                //alert("Error fetching available start times.");
                window.location.href = '/auth/login-page';
            } finally {
                hideLoading();  // Hide spinner after fetch completes
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

// Hamburger button
document.addEventListener("DOMContentLoaded", function () {
    const hamburgerButton = document.getElementById("hamburgerButton");
    const dropdownMenu = document.getElementById("dropdownMenu");
    const logoutButton = document.getElementById("logoutButton");

    if (!hamburgerButton) return;
    // Toggle dropdown menu on hamburger click
    hamburgerButton.addEventListener("click", () => {
        dropdownMenu.classList.toggle("active");
    });

    // Close dropdown when clicking outside
    document.addEventListener("click", (event) => {
        if (!hamburgerButton.contains(event.target) && !dropdownMenu.contains(event.target)) {
            dropdownMenu.classList.remove("active");
        }
    });

    // Logout functionality
    if (logoutButton) {
        logoutButton.addEventListener("click", function (event) {
            event.preventDefault(); // Prevent default anchor behavior

            // Clear access token (logout)
            document.cookie = "access_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
            
            // Redirect to login page
            window.location.href = "/auth/login-page";
        });
    }
});

// Function to show loading animation
function showLoading() {
    document.getElementById("loadingSpinner").classList.remove("hidden");
}

// Function to hide loading animation
function hideLoading() {
    document.getElementById("loadingSpinner").classList.add("hidden");
}

// Password Change Form
const passwordChangeForm = document.getElementById("passwordChangeForm");
    if (passwordChangeForm) {
        passwordChangeForm.addEventListener('submit', async function (event) {
            event.preventDefault();

            const form = event.target;
            const formData = new FormData(form);

            const passwordData = {
                currentPassword: formData.get("currentPassword"),
                newPassword: formData.get("newPassword")
            }

            console.log("passwordData:", JSON.stringify(passwordData))

            showLoading();  // Show spinner before the request
            try {
                if (passwordData.newPassword.length < 6) {
                    alert("New password must be at least 6 characters long");
                    throw new Error("New password must be at least 6 characters long");
                }
                const response = await fetch('/user/change-password', {
                    method: 'PUT',
                    headers: {
                        "Content-Type": 'application/json',
                        "Authorization": `Bearer ${getToken()}`

                    },
                    body: JSON.stringify(passwordData)
                });

                if (response.ok) {
                    // Handle success
                    //const data = await response.json();
                    // Delete any cookies available
                    //logout();
                    // Save token to cookie
                    //document.cookie = `access_token=${data.access_token}; path=/`;
                    alert('Password change successful');
                    window.location.href = '/auth/login-page'; // Change this to your desired redirect page
                } else {
                    // Handle error
                    const errorData = await response.json();
                    alert(`Error: ${errorData.detail}`);
                }
            } catch (error) {
                console.error('Error:', error);
                alert('An error occurred. Please try again.');
            } finally {
                hideLoading(); // Hide spinner after fetch completes
            }
        });
    }

// password toggle - fa-eye
document.addEventListener('DOMContentLoaded', function() {
    const togglePassword = document.querySelector('#togglePassword');
    const password = document.querySelector('#current-password');
    const toggleNewPassword = document.querySelector('#toggleNewPassword');
    const newPassword = document.querySelector('#new-password');
    
    if (!togglePassword) return;
    if (!toggleNewPassword) return;
    function togglePasswordVisibility(field, icon) {
        const type = field.getAttribute('type') === 'password' ? 'text' : 'password';
        field.setAttribute('type', type);
        icon.classList.toggle('fa-eye-slash');
        icon.classList.toggle('fa-eye');
    }

    togglePassword.addEventListener('click', function() {
        togglePasswordVisibility(password, this);
    });

    toggleNewPassword.addEventListener('click', function() {
        togglePasswordVisibility(newPassword, this);
    });
});

// password toggle - fa-eye
document.addEventListener('DOMContentLoaded', function() {
    const togglePassword = document.querySelector('#toggleLoginPassword');
    const password = document.querySelector('#password');
    
    if (!togglePassword) return;

    function togglePasswordVisibility(field, icon) {
        const type = field.getAttribute('type') === 'password' ? 'text' : 'password';
        field.setAttribute('type', type);
        icon.classList.toggle('fa-eye-slash');
        icon.classList.toggle('fa-eye');
    }

    togglePassword.addEventListener('click', function() {
        togglePasswordVisibility(password, this);
    });
});

// Confirm Booking
document.addEventListener("DOMContentLoaded", function () {
    const confirmBookingButton = document.getElementById("confirmEndTime");
    const datePicker = document.getElementById("datePicker");
    const startTimePicker = document.getElementById("startTimePicker");
    const endTimePicker = document.getElementById("endTimePicker");

    if (!confirmBookingButton) return;

    confirmBookingButton.addEventListener("click", async function (event) {
        event.preventDefault();

        // Extract values from form
        const selectedDate = datePicker.value;
        const selectedStartTime = startTimePicker.value;
        const selectedEndTime = endTimePicker.value;

        if (!selectedDate || !selectedStartTime || !selectedEndTime) {
            alert("Please select a date, start time, and end time before confirming.");
            return;
        }

        const startTimeISO = convertToISO(selectedDate, selectedStartTime);
        const endTimeISO = convertToISO(selectedDate, selectedEndTime);

        // Retrieve user_id from token
        const token = getToken();
        if (!token) {
            alert("Authentication error. Please log in again.");
            window.location.href = "/auth/login-page";
            return;
        }

        let user_id;
        try {
            const payload = JSON.parse(atob(token.split(".")[1])); // Decode JWT payload
            user_id = payload.id;
        } catch (error) {
            console.error("Error decoding token:", error);
            alert("Invalid session. Please log in again.");
            window.location.href = "/auth/login-page";
            return;
        }

        // Prepare request payload
        const requestBody = {
            user_id: user_id,
            date: selectedDate,
            start_time: startTimeISO,
            end_time: endTimeISO,
            status: "Confirmed"
        };

        console.log("Confirming Booking:", requestBody);

        showLoading(); // Show spinner before request

        try {
            const response = await fetch("/bookings/confirm-booking", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify(requestBody),
            });

            // Log the full response object to inspect it in detail
            console.log("Network Response:", response);

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || "Failed to confirm booking.");
            }

            const data = await response.json();
            //console.log("Booking Confirmed:", data);
            // console.log("Bookings Array:", data.bookings);
            // console.log("0: user_id:", data.bookings[0].user_id);
            // console.log("0: date:", data.bookings[0].date);
            // console.log("0: start_time:", data.bookings[0].start_time);
            // console.log("0: end_time:", data.bookings[0].end_time);
            // console.log("0: status:", data.bookings[0].status);
            // console.log("1: start_time:", data.bookings[1].start_time);
            //console.log("first value from Bookings Array:", data.bookings[0].end_time);
            //console.log("Typeof bookings array:", typeof(data.bookings));

            //alert("Booking confirmed successfully!");
            document.getElementById("startTimePicker").value = "";
            document.getElementById("endTimePicker").value = "";
            updateBookingsList(data.bookings);

        } catch (error) {
            console.error("Error confirming booking:", error);
            alert(error.message);
        } finally {
            hideLoading(); // Hide spinner after request
        }
    });
});

// Convert date and time to ISO 8601 format with correct Sydney timezone offset
function convertToISO(date, time) {
    // Create a date object from selected date & time
    const dateTime = new Date(`${date}T${time}:00`);

    // Get Sydney timezone offset dynamically
    const sydneyTimeZone = "Australia/Sydney";
    const formatter = new Intl.DateTimeFormat("en-AU", {
        timeZone: sydneyTimeZone,
        timeZoneName: "longOffset"
    });
    
    const parts = formatter.formatToParts(dateTime);
    const offsetPart = parts.find(part => part.type === "timeZoneName").value;
    
    // Extract offset in "+HH:MM" format
    const offsetMatch = offsetPart.match(/GMT([+-]\d{2}):(\d{2})/);
    const formattedOffset = offsetMatch ? `${offsetMatch[1]}:${offsetMatch[2]}` : "+00:00";

    return `${date}T${time}:00${formattedOffset}`;
}

// Update the bookings container with the bookings
document.addEventListener('DOMContentLoaded', function() {
    if (typeof bookingsData !== 'undefined') {
        updateBookingsList(bookingsData);
    }
});
function updateBookingsList(bookings) {
    const bookingsContainer = document.getElementById("bookingsContainer");
    if (!bookingsContainer) return;

    // Clear previous bookings
    bookingsContainer.innerHTML = "";

    // Create table header
    const tableHeader = document.createElement("div");
    tableHeader.className = "booking-header";
    tableHeader.innerHTML = `
        <span class="booking-column">User</span>
        <span class="booking-column">Date</span>
        <span class="booking-column">Time</span>
    `;
    bookingsContainer.appendChild(tableHeader);

    // Render the updated bookings
    bookings.forEach(booking => {
        const bookingElement = document.createElement("div");
        bookingElement.className = "booking-row";
        
        const startTime = booking.start_time.split('T')[1].split(':').slice(0, 2).join(':');
        const endTime = booking.end_time.split('T')[1].split(':').slice(0, 2).join(':');
        
        bookingElement.innerHTML = `
            <span class="booking-column">${booking.username}</span>
            <span class="booking-column">${booking.date}</span>
            <span class="booking-column">${startTime} - ${endTime}</span>
        `;
        bookingsContainer.appendChild(bookingElement);
    });
}

document.addEventListener('DOMContentLoaded', function() {
    const dashboardLink = document.getElementById('dashboard');
    if (dashboardLink) {
        dashboardLink.addEventListener('click', handleDashboardClick);
    }
});

function handleDashboardClick(event) {
    event.preventDefault();
    if (window.location.pathname === '/bookings/bookings-page') {
        window.location.reload();
    } else {
        window.location.href = '/bookings/bookings-page';
    }
}
