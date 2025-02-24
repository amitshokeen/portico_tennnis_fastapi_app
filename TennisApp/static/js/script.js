// Mock data 
const busyDatesAndTimes = [
    {"user_name": "a101", "date": "2025-02-10", "start_time": "16:30", "end_time": "17:00"},
    {"user_name": "d203", "date": "2025-02-10", "start_time": "19:00", "end_time": "20:00"},
    {"user_name": "c402", "date": "2025-02-11", "start_time": "06:30", "end_time": "07:30"},
    {"user_name": "d103", "date": "2025-02-13", "start_time": "09:00", "end_time": "10:00"},
    {"user_name": "d201", "date": "2025-02-13", "start_time": "18:30", "end_time": "19:30"},
    {"user_name": "b505", "date": "2025-02-15", "start_time": "19:30", "end_time": "20:30"}
]
const START_HOUR = "06:00";
const END_HOUR = "22:00";
/*
To make the startTimePicker and the endTimePicker drop-down lists shorter, 
I'm using a TIME_INTERVAL value. This value indicates minutes. 
So, for e.g., the startTimePicker will have first value as 6:00 AM,
and the next one as 6:15 AM and so on.
*/
const TIME_INTERVAL = 15;

// Variables to track AM/PM selection
let startFilter = "AM";
let endFilter = "AM";

// Call function after JSON data is loaded
populateBlockedTimeTable(busyDatesAndTimes);

// This function is in the freeTimes.js file
freeTimesJSON = calculateFreeTimes(START_HOUR, END_HOUR, busyDatesAndTimes);
console.log("freeTimesJSON data before populating start times:", JSON.stringify(freeTimesJSON, null, 2));

// Set today's date as the default value in the date picker
// Here "DOMContentLoaded" is an event that fires when the initial HTML document has been completely loaded and parsed. In other words, as soon as this HTML page is in a good shape, execute the fucntion to set selectedDate as today's date.
document.addEventListener("DOMContentLoaded", function () {
    console.log("DOMContentLoaded event fired");
    const today = moment().format("YYYY-MM-DD"); // Get current date in YYYY-MM-DD format
    document.getElementById("datePicker").value = today; // Set the value
    selectedDate = today;
    console.log("selectedDate: ", selectedDate);
    populateStartTimes(START_HOUR, END_HOUR, TIME_INTERVAL, selectedDate, freeTimesJSON); // Populate time slots for today's date
});

// Make the entire "Select a Date" box is clickable
document.getElementById("datePickerContainer").addEventListener("click", function() {
    document.getElementById("datePicker").showPicker(); // Opens the native date picker
});

// Change to the desired date and assign the new date to selectedDate
document.getElementById("datePicker").addEventListener("change", function() {
    selectedDate = this.value;
    console.log("Date changed to: ", selectedDate);
    populateStartTimes(START_HOUR, END_HOUR, TIME_INTERVAL, selectedDate, freeTimesJSON);
});

// AM/PM Button Click Events
document.getElementById("startAM").addEventListener("click", () => {
    startFilter = "AM";
    // just so you know: the "active-filter" is a CSS class. So the line below will add this CSS class to the clicked element, and the line below that will remove this class from the element with ID as "startPM". This will help the user know what he has selected.
    document.getElementById("startAM").classList.add("active-filter");
    document.getElementById("startPM").classList.remove("active-filter");
    console.log("StartFilter clicked: ", startFilter)
    // Enable endAM and endPM for selection
    document.getElementById("endAM").disabled = false;
    document.getElementById("endPM").disabled = false;
    populateStartTimes(START_HOUR, END_HOUR, TIME_INTERVAL, selectedDate, freeTimesJSON);
});

document.getElementById("startPM").addEventListener("click", () => {
    startFilter = "PM";
    document.getElementById("startPM").classList.add("active-filter");
    document.getElementById("startAM").classList.remove("active-filter");
    console.log("StartFilter clicked: ", startFilter)
    // Auto-click endPM & disable endAM
    document.getElementById("endPM").click();
    document.getElementById("endAM").disabled = true;
    populateStartTimes(START_HOUR, END_HOUR, TIME_INTERVAL, selectedDate, freeTimesJSON);
});

document.getElementById("endAM").addEventListener("click", () => {
    if (document.getElementById("endAM").disabled) return; // Prevent clicking when disabled
    endFilter = "AM";
    document.getElementById("endAM").classList.add("active-filter");
    document.getElementById("endPM").classList.remove("active-filter");
    console.log("endFilter clicked: ", endFilter)
    //populateEndTimes(document.getElementById("startTimePicker").value);
    populateEndTimes(END_HOUR, TIME_INTERVAL, selectedDate, freeTimesJSON, document.getElementById("startTimePicker").value);
});

document.getElementById("endPM").addEventListener("click", () => {
    endFilter = "PM";
    document.getElementById("endPM").classList.add("active-filter");
    document.getElementById("endAM").classList.remove("active-filter");
    console.log("endFilter clicked: ", endFilter)
    //populateEndTimes(document.getElementById("startTimePicker").value);
    populateEndTimes(END_HOUR, TIME_INTERVAL, selectedDate, freeTimesJSON, document.getElementById("startTimePicker").value);
});

// Show dropdowns when clicking the inputs
document.getElementById("startTimePicker").addEventListener("click", () => {
    document.getElementById("startTimeMenu").style.display = "block";
});

document.getElementById("endTimePicker").addEventListener("click", () => {
    document.getElementById("endTimeMenu").style.display = "block";
});
