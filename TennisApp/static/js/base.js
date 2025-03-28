// Login Form
document.addEventListener("DOMContentLoaded", function () {
    // Only run this redirect logic if we're actually on the login page
    if (window.location.pathname === "/auth/login-page") {
        fetch("/auth/check-session", {
            method: "GET",
            credentials: "include"
        }).then(res => {
            if (res.ok) {
                console.log("User is authenticated (via backend), redirecting...");
                window.location.href = "/bookings/bookings-page";
            } else {
                console.log("User is not authenticated, stay on login page.");
            }
        }).catch(error => {
            console.error("Session check failed:", error);
        });
    }

    const loginForm = document.getElementById("loginForm");
    if (!loginForm) return;

    loginForm.addEventListener("submit", async function (event) {
        event.preventDefault();

        const form = event.target;
        const formData = new FormData(form);

        // Convert username to lowercase to enforce case-insensitive login
        formData.set("username", formData.get("username").toLowerCase());

        // Check if "Remember Me" is checked
        const rememberMeCheckbox = document.getElementById("rememberMe");
        const rememberMe = rememberMeCheckbox.checked ? "true" : "false";
        formData.set("remember_me", rememberMe); // Add "remember_me" to the form data

        // Prepare payload
        const payload = new URLSearchParams();
        for (const [key, value] of formData.entries()) {
            payload.append(key, value);
        }

        showLoading();  // Show loading spinner before sending request

        try {
            const response = await fetch("/auth/login", {  // Updated endpoint
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded"
                },
                body: payload.toString(),
                credentials: "include"  // Ensures cookies are sent with the request
            });

            if (response.ok) {
                // Redirect to the bookings page upon successful login
                window.location.href = "/bookings/bookings-page";
            } else {
                // Handle errors
                const errorData = await response.json();
                alert(`Error: ${errorData.detail}`);
            }
        } catch (error) {
            console.error("Error:", error);
            alert("An error occurred. Please try again.");
        } finally {
            hideLoading(); // Hide loading spinner after fetch completes
        }
    });
});

/* The date picker does not work as expected on iPhone with Chrome as well as the Safari browser. 
The date picker must block all dates other than the current date and the dates 6 days ahead in the future.
But, although this works well on all browsers on PC as well as Android phone, it does not do so on iPhone.
I am commenting out the datepicker related code and replacing it with the code that should work on iPhone as well.
The challenge is that testing can only be done once the app is deployed to production & then I can test it on my son's iPhone.*/
// Make the entire "Select a Date" box clickable
// document.addEventListener("DOMContentLoaded", function () {
//     const datePickerContainer = document.getElementById("datePickerContainer");
//     if (datePickerContainer) {
//         datePickerContainer.addEventListener("click", function() {
//             document.getElementById("datePicker").showPicker(); 
//         });
//     }
// });

// // Intl.DateTimeFormat takes care of the timezone and the daylight change
// const formatter = new Intl.DateTimeFormat('en-CA', {
//     year: 'numeric', month: '2-digit', day: '2-digit'
// });

// // Date picker
// document.addEventListener("DOMContentLoaded", function () {
//     const datePicker = document.getElementById("datePicker");
//     if (!datePicker) return;
//     const today = new Date();
//     const one_week_later = new Date();
//     let user_selected_date = formatter.format(today); // yyyy-MM-dd format accepted by the browser. user_selected_date is initiated as current date.
//     one_week_later_formatted = formatter.format(
//         one_week_later.setDate(
//             today.getDate() + 6
//         ))
    
//     datePicker.value = user_selected_date;
//     datePicker.min = formatter.format(today);
//     datePicker.max = one_week_later_formatted;
//     // Log the initial value on page load
//     console.log("Initial date on page load:", user_selected_date);

//     // User changes the date
//     datePicker.addEventListener("change", function () {
//         user_selected_date = datePicker.value;
//         console.log("User's selected date:", user_selected_date);
//     });
// });
/* The updated code for the datepicker starts here. try1*/
/* Again replacing this entire block as it did not produce the desired result.*/
// document.addEventListener("DOMContentLoaded", function () {
//     const datePickerContainer = document.getElementById("datePickerContainer");
//     const datePicker = document.getElementById("datePicker");
//     if (!datePicker) return;

//     // Make the entire "Select a Date" box clickable
//     if (datePickerContainer) {
//         datePickerContainer.addEventListener("click", function () {
//             datePicker.showPicker();
//         });
//     }

//     const today = new Date();
//     const oneWeekLater = new Date();
//     oneWeekLater.setDate(today.getDate() + 6);

//     // Format the dates in ISO format (yyyy-mm-dd) which input[type="date"] expects
//     const formatDate = (date) => {
//         return date.toISOString().split("T")[0]; // gives yyyy-MM-dd
//     };

//     const user_selected_date = formatDate(today);
//     const one_week_later_formatted = formatDate(oneWeekLater);

//     // Set date picker boundaries
//     datePicker.value = user_selected_date;
//     datePicker.min = user_selected_date;
//     datePicker.max = one_week_later_formatted;

//     console.log("Initial date on page load:", user_selected_date);

//     // Handle user change
//     datePicker.addEventListener("change", function () {
//         console.log("User's selected date:", datePicker.value);
//     });
// });
/* This is the end of the datepicker code. try1 */
/* Start of the datepicker code. This time using Flatpickr. try2*/
// Use Flatpickr for consistent date picking across browsers
// document.addEventListener("DOMContentLoaded", function () {
//     const datePicker = document.getElementById("datePicker");
//     if (!datePicker) return;

//     const today = new Date();
//     const oneWeekLater = new Date();
//     oneWeekLater.setDate(today.getDate() + 6);

//     // Initialize Flatpickr
//     flatpickr(datePicker, {
//         minDate: today,
//         maxDate: oneWeekLater,
//         defaultDate: today,
//         dateFormat: "Y-m-d",
//         onChange: function (selectedDates, dateStr) {
//             console.log("User selected date:", dateStr);
//         }
//     });
// });
/* end of try2. Works well on my Mac on localhost. Let me deploy and test on my son's iPhone*/
/* start try3 */
// Make the entire "Select a Date" box clickable
// document.addEventListener("DOMContentLoaded", function () {
//     const datePickerContainer = document.getElementById("datePickerContainer");
//     if (datePickerContainer) {
//         datePickerContainer.addEventListener("click", function () {
//             document.getElementById("datePicker").showPicker();
//         });
//     }
// });

// // Intl.DateTimeFormat for consistent yyyy-MM-dd format
// const formatter = new Intl.DateTimeFormat('en-CA', {
//     year: 'numeric',
//     month: '2-digit',
//     day: '2-digit'
// });

// // Date picker setup
// document.addEventListener("DOMContentLoaded", function () {
//     const datePicker = document.getElementById("datePicker");
//     if (!datePicker) return;

//     const today = new Date();
//     const oneWeekLater = new Date();
//     oneWeekLater.setDate(today.getDate() + 6);

//     // Format to yyyy-MM-dd
//     const formatDate = (date) => {
//         return date.toISOString().split("T")[0];
//     };

//     const todayStr = formatDate(today);
//     const oneWeekLaterStr = formatDate(oneWeekLater);

//     // Set initial value and boundaries
//     datePicker.value = todayStr;
//     datePicker.min = todayStr;
//     datePicker.max = oneWeekLaterStr;

//     console.log("Initial date on page load:", todayStr);

//     // Manual validation fallback for devices that ignore min/max
//     datePicker.addEventListener("change", function () {
//         const selected = new Date(datePicker.value);
//         selected.setHours(0, 0, 0, 0);
//         today.setHours(0, 0, 0, 0);
//         oneWeekLater.setHours(0, 0, 0, 0);

//         if (selected < today || selected > oneWeekLater) {
//             alert("Please select a date between today and 6 days from now.");
//             datePicker.value = todayStr; // Reset to today
//             console.warn("Invalid date selected. Reset to today.");
//         } else {
//             console.log("User's selected date:", datePicker.value);
//         }
//     });
// });
/* end try3 */
/* start try4 */
// function formatDateLocal(date) {
//     const sydneyFormatter = new Intl.DateTimeFormat('en-CA', {
//         timeZone: 'Australia/Sydney',
//         year: 'numeric',
//         month: '2-digit',
//         day: '2-digit'
//     });

//     // Converts from parts (ensures consistent yyyy-MM-dd format)
//     const parts = sydneyFormatter.formatToParts(date);
//     const year = parts.find(p => p.type === 'year').value;
//     const month = parts.find(p => p.type === 'month').value;
//     const day = parts.find(p => p.type === 'day').value;

//     return `${year}-${month}-${day}`;
// }
// document.addEventListener("DOMContentLoaded", function () {
//     const datePicker = document.getElementById("datePicker");
//     const datePickerButton = document.getElementById("datePickerButton");

//     if (!datePicker || !datePickerButton) return;

//     const today = new Date();
//     const oneWeekLater = new Date();
//     oneWeekLater.setDate(today.getDate() + 6);

//     const todayFormatted = formatDateLocal(today);
//     const maxDateFormatted = formatDateLocal(oneWeekLater);

//     datePicker.min = todayFormatted;
//     datePicker.max = maxDateFormatted;
//     datePicker.value = todayFormatted;

//     console.log("Initial date (Sydney):", todayFormatted);

//     // Show native date picker
//     datePickerButton.addEventListener("click", function () {
//         datePicker.showPicker();
//     });

//     // On change
//     datePicker.addEventListener("change", function () {
//         const selected = datePicker.value;
//         console.log("User selected:", selected);

//         if (selected < todayFormatted || selected > maxDateFormatted) {
//             alert("Please choose a date within the next 7 days.");
//             datePicker.value = todayFormatted;
//         }

//         datePickerButton.textContent = `Date: ${selected}`;
//     });

//     datePickerButton.textContent = `Date: ${todayFormatted}`;
// });
/* end try4 */
/* start try5 */
// document.addEventListener("DOMContentLoaded", function () {
//     const datePicker = document.getElementById("datePicker");
//     const dateOptions = dateOptionsData;

//     // Populate the dropdown with date options
//     dateOptions.forEach((option) => {
//         const optionElement = document.createElement("option");
//         optionElement.value = option.value;
//         optionElement.textContent = option.label;
//         datePicker.appendChild(optionElement);
//     });

//     // Event listener for date selection
//     datePicker.addEventListener("change", function() {
//         const selectedDate = this.value;
//         console.log("Selected date:", selectedDate);
//         // You can use this selectedDate value for further processing
//     });
// });
/* end try5 */
/* start try6 */
// document.addEventListener("DOMContentLoaded", function () {
//     const datePicker = document.getElementById("datePicker");
//     const dateOptions = dateOptionsData;

//     // Get current date in Sydney timezone
//     const sydneyTime = new Date().toLocaleString("en-US", {timeZone: "Australia/Sydney"});
//     const currentDate = new Date(sydneyTime).toISOString().split('T')[0];

//     // Populate the dropdown with date options
//     dateOptions.forEach((option) => {
//         const optionElement = document.createElement("option");
//         optionElement.value = option.value;
//         optionElement.textContent = option.label;
        
//         // Pre-select the current date
//         if (option.value === currentDate) {
//             optionElement.selected = true;
//         }
        
//         datePicker.appendChild(optionElement);
//     });

//     // Event listener for date selection
//     datePicker.addEventListener("change", function() {
//         const selectedDate = this.value;
//         console.log("Selected date:", selectedDate);
//         // You can use this selectedDate value for further processing
//     });

//     // Trigger change event for initial selection
//     datePicker.dispatchEvent(new Event('change'));
// });
/* end try6 */
/* start try7 */
// document.addEventListener("DOMContentLoaded", function () {
//     const datePicker = document.getElementById("datePicker");
//     const dateOptions = dateOptionsData;

//     // Add the "Select a Date:" option
//     const defaultOption = document.createElement("option");
//     defaultOption.value = "";
//     defaultOption.textContent = "Select a Date:";
//     defaultOption.disabled = true;
//     defaultOption.selected = true;
//     datePicker.appendChild(defaultOption);

//     // Populate the dropdown with date options
//     dateOptions.forEach((option) => {
//         const optionElement = document.createElement("option");
//         optionElement.value = option.value;
//         optionElement.textContent = option.label;
//         datePicker.appendChild(optionElement);
//     });

//     // Event listener for date selection
//     datePicker.addEventListener("change", function() {
//         const selectedDate = this.value;
//         console.log("Selected date:", selectedDate);
//         // You can use this selectedDate value for further processing
//     });
// });
/* end try7 */
/* start try8 */
document.addEventListener("DOMContentLoaded", function () {
    const datePicker = document.getElementById("datePicker");
    const dateMenu = document.getElementById("dateMenu");
    const dateOptions = dateOptionsData; // from the backend

    if (datePicker && dateMenu) {
        datePicker.addEventListener("click", () => {
            dateMenu.style.display = "block";
            populateDateMenu(dateOptions);
        });
    }

    function populateDateMenu(availableDates) {
        dateMenu.innerHTML = ""; // Clear existing options

        if (availableDates.length === 0) {
            dateMenu.innerHTML = "<div>No available dates</div>";
            return;
        }

        availableDates.forEach(dateOption => {
            const dateElement = document.createElement("div");
            dateElement.textContent = dateOption.label; //for display
            dateElement.addEventListener("click", () => {
                datePicker.value = dateOption.label;
                datePicker.dataset.value = dateOption.value; // Store the YYYY-MM-DD format
                dateMenu.style.display = "none";
                // Trigger any necessary updates for start time picker
                document.getElementById("startTimePicker").value = "";
                document.getElementById("endTimePicker").value = "";
            });

            dateMenu.appendChild(dateElement);
        });
    }

    // Hide the dropdown when clicking outside
    document.addEventListener("click", (event) => {
        if (!datePicker.contains(event.target) && !dateMenu.contains(event.target)) {
            dateMenu.style.display = "none";
        }
    });
});
/* end try8 */

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
            //console.log("startTimeMenu clicked...");

            // Get the selected date from the date picker
            //const selectedDate = datePicker.value;
            const selectedDate = datePicker.dataset.value;
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
                        //"Authorization": `Bearer ${getToken()}`
                    },
                    body: JSON.stringify({ date: selectedDate }),
                    credentials: 'include'
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }

                const data = await response.json();
                //console.log("Available start times:", data.available_start_times);

                // let me convert the times to AM, PM here.    
                //console.log("******", data.available_start_times[63])

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
            //console.log("endTimeMenu clicked...");

            // Get the selected date from the date picker
            //const selectedDate = datePicker.value;
            const selectedDate = datePicker.dataset.value;
            if (!selectedDate) {
                alert("Please select a date first.");
                return;
            }

            // Get the selected start time from the start time picker
            const startTime = startTimePicker.value;
            //console.log("startTime value is:", startTime)
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
                        //"Authorization": `Bearer ${getToken()}`
                    },
                    body: JSON.stringify({ 
                        date: selectedDate,
                        start_time: startTime
                    }),
                    credentials: 'include'
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }

                const data = await response.json();
                //console.log("Available end times:", data.available_end_times);

                // let me convert the times to AM, PM here.    
                //console.log("******", data.available_end_times[63])

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
            event.preventDefault();

            //console.log("Logging out...");

            // Clear access token (logout)
            document.cookie = "access_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
            
            // Send logout request to backend
            fetch("/auth/logout", {
                method: "POST",
                credentials: "include"
            }).then(() => {
                //console.log("Logout request sent.");
                window.location.href = "/auth/login-page"; // Redirect to login page
            }).catch(error => {
                console.error("Logout error:", error);
                window.location.href = "/auth/login-page"; // Ensure redirection even if logout request fails
            });
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

            //console.log("passwordData:", JSON.stringify(passwordData))

            showLoading();  // Show spinner before the request
            try {
                if (passwordData.newPassword.length < 6) {
                    alert("New password must be at least 6 characters long");
                    throw new Error("New password must be at least 6 characters long");
                }
                const response = await fetch('/user/change-password', {
                    method: 'PUT',
                    headers: {
                        "Content-Type": 'application/json'
                    },
                    body: JSON.stringify(passwordData),
                    credentials: 'include'
                });

                if (response.ok) {
                    document.cookie = "access_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
                    alert('Password change successful.');
                    // Send logout request to backend
                    fetch("/auth/logout", {
                        method: "POST",
                        credentials: "include"
                    }).then(() => {
                        //console.log("Logout request sent.");
                        window.location.href = "/auth/login-page"; // Redirect to login page
                    }).catch(error => {
                        console.error("Logout error:", error);
                        window.location.href = "/auth/login-page"; // Ensure redirection even if logout request fails
                    });
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
        //const selectedDate = datePicker.value;
        const selectedDate = datePicker.dataset.value;
        const selectedStartTime = startTimePicker.value;
        const selectedEndTime = endTimePicker.value;

        if (!selectedDate || !selectedStartTime || !selectedEndTime) {
            alert("Please select a date, start time, and end time before confirming.");
            return;
        }

        const startTimeISO = convertToISO(selectedDate, selectedStartTime);
        const endTimeISO = convertToISO(selectedDate, selectedEndTime);

        // // Retrieve user_id from token
        // const token = getToken();
        // if (!token) {
        //     alert("Authentication error. Please log in again.");
        //     window.location.href = "/auth/login-page";
        //     return;
        // }

        // let user_id;
        // try {
        //     const payload = JSON.parse(atob(token.split(".")[1])); // Decode JWT payload
        //     user_id = payload.id;
        // } catch (error) {
        //     console.error("Error decoding token:", error);
        //     alert("Invalid session. Please log in again.");
        //     window.location.href = "/auth/login-page";
        //     return;
        // }

        // Prepare request payload
        const requestBody = {
            //user_id: user_id,
            date: selectedDate,
            start_time: startTimeISO,
            end_time: endTimeISO,
            status: "Confirmed"
        };

        //console.log("Confirming Booking:", requestBody);

        showLoading(); // Show spinner before request

        try {
            const response = await fetch("/bookings/confirm-booking", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    //"Authorization": `Bearer ${token}`
                },
                body: JSON.stringify(requestBody),
                credentials: 'include'
            });

            // Log the full response object to inspect it in detail
            //console.log("Network Response:", response);

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
