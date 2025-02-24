// function populateEndTimes(END_HOUR, TIME_INTERVAL, selectedDate, freeTimesJSON, selectedStartTimeValue) {
//     console.log("Inside populateEndTimes function. Value of endFilter: ", endFilter);
//     console.log("Inside populateEndTimes function. Value of selectedStartTimeValue: ", selectedStartTimeValue);

//     const endTimeMenu = document.getElementById("endTimeMenu");
//     endTimeMenu.innerHTML = ""; // Clear existing options

//     // Helper function to convert "HH:mm" to total minutes from midnight
//     const parseTime = (timeStr) => {
//         const [hours, minutes] = timeStr.split(":").map(Number);
//         return hours * 60 + minutes;
//     };

//     // Helper function to format time as "h:mm A"
//     const formatTime = (minutes) => {
//         return moment().startOf('day').add(minutes, 'minutes').format("h:mm A");
//     };

//     // Convert START_HOUR and END_HOUR to minutes from midnight
//     const endLimit = parseTime(END_HOUR);

//     // Convert selected start time to minutes from midnight
//     const selectedStartMinutes = moment(selectedStartTimeValue, "h:mm A").diff(moment().startOf('day'), 'minutes');

//     console.log("Inside populateEndTimes function. Selected Start Time in minutes:", selectedStartMinutes);

//     // Find free times for the selected date
//     const selectedFreeTimes = freeTimesJSON.filter(slot => slot.date === selectedDate);

//     let validEndTimes = [];

//     // If no free times found, assume the entire day is free
//     if (selectedFreeTimes.length === 0) {
//         console.log("No free times found for", selectedDate, "- Assuming all times are free.");

//         for (let minutes = selectedStartMinutes + TIME_INTERVAL; minutes <= endLimit; minutes += TIME_INTERVAL) {
//             validEndTimes.push(minutes);
//         }
//     } else {
//         console.log("Free time slots found for", selectedDate);

//         selectedFreeTimes.forEach(({ from, to }) => {
//             // let slotStart = parseTime(from);
//             // let slotEnd = parseTime(to);
//             let slotStart = moment(from, "h:mm A").diff(moment().startOf('day'), 'minutes');;
//             let slotEnd = moment(to, "h:mm A").diff(moment().startOf('day'), 'minutes');

//             if (selectedStartMinutes >= slotStart && selectedStartMinutes < slotEnd) {
//                 for (let minutes = selectedStartMinutes + TIME_INTERVAL; minutes <= slotEnd; minutes += TIME_INTERVAL) {
//                     validEndTimes.push(minutes);
//                 }
//             }
//         });
//     }

//     console.log("Valid End Times:", validEndTimes.map(formatTime));

//     // Populate the dropdown with valid end times
//     validEndTimes.forEach(minutes => {
//         const timeOption = document.createElement("div");
//         timeOption.textContent = formatTime(minutes);
//         timeOption.onclick = () => selectEndTime(formatTime(minutes));
//         timeOption.classList.add("p-2", "cursor-pointer", "hover:bg-gray-200"); // Tailwind styles
//         endTimeMenu.appendChild(timeOption);
//     });

//     // If no available times, show a message
//     if (endTimeMenu.innerHTML === "") {
//         endTimeMenu.innerHTML = "<div class='p-2 text-gray-500'>No available end times</div>";
//     }
//     console.log("End times populated successfully.");
// }

function populateEndTimes(END_HOUR, TIME_INTERVAL, selectedDate, freeTimesJSON, selectedStartTimeValue) {
    console.log("Inside populateEndTimes function. Value of endFilter: ", endFilter);
    console.log("Inside populateEndTimes function. Value of selectedStartTimeValue: ", selectedStartTimeValue);

    //endFilter = "AM"; // This is a hard-coded value for testing and will be removed later.

    const endTimeMenu = document.getElementById("endTimeMenu");
    endTimeMenu.innerHTML = ""; // Clear existing options

    // Helper function to convert "HH:mm" to total minutes from midnight
    const parseTime = (timeStr) => {
        const [hours, minutes] = timeStr.split(":").map(Number);
        return hours * 60 + minutes;
    };

    // Helper function to format time as "h:mm A"
    const formatTime = (minutes) => {
        return moment().startOf('day').add(minutes, 'minutes').format("h:mm A");
    };

    // Convert END_HOUR to minutes from midnight
    const endLimit = parseTime(END_HOUR);

    // Convert selected start time to minutes from midnight
    const selectedStartMinutes = moment(selectedStartTimeValue, "h:mm A").diff(moment().startOf('day'), 'minutes');

    console.log("Inside populateEndTimes function. Selected Start Time in minutes:", selectedStartMinutes);

    // Find free times for the selected date
    const selectedFreeTimes = freeTimesJSON.filter(slot => slot.date === selectedDate);

    let validEndTimes = [];

    // If no free times found, assume the entire day is free
    if (selectedFreeTimes.length === 0) {
        console.log("No free times found for", selectedDate, "- Assuming all times are free.");

        for (let minutes = selectedStartMinutes + TIME_INTERVAL; minutes <= endLimit; minutes += TIME_INTERVAL) {
            validEndTimes.push(formatTime(minutes)); // Store formatted time
        }
    } else {
        console.log("Free time slots found for", selectedDate);

        selectedFreeTimes.forEach(({ from, to }) => {
            let slotStart = moment(from, "h:mm A").diff(moment().startOf('day'), 'minutes');
            let slotEnd = moment(to, "h:mm A").diff(moment().startOf('day'), 'minutes');

            if (selectedStartMinutes >= slotStart && selectedStartMinutes < slotEnd) {
                for (let minutes = selectedStartMinutes + TIME_INTERVAL; minutes <= slotEnd; minutes += TIME_INTERVAL) {
                    validEndTimes.push(formatTime(minutes)); // Store formatted time
                }
            }
        });
    }

    console.log("Valid End Times before filtering:", validEndTimes);

    // Step 1: Filter times based on endFilter (Remove AM/PM values accordingly)
    const filteredEndTimes = validEndTimes.filter(time => {
        const isAM = time.includes("AM");
        return (endFilter === "AM" && isAM) || (endFilter === "PM" && !isAM);
    });

    console.log("Filtered End Times:", filteredEndTimes);

    // Step 2: Populate the endTimeMenu dropdown with filtered values
    if (filteredEndTimes.length > 0) {
        filteredEndTimes.forEach(timeValue => {
            const timeOption = document.createElement("div");
            timeOption.textContent = timeValue;
            timeOption.onclick = () => selectEndTime(timeValue);
            timeOption.classList.add("p-2", "cursor-pointer", "hover:bg-gray-200"); // Tailwind styles
            endTimeMenu.appendChild(timeOption);
        });
    } else {
        endTimeMenu.innerHTML = "<div class='p-2 text-gray-500'>No available end times</div>";
    }

    console.log("End times populated successfully.");
}

function selectEndTime(time) {
    document.getElementById("endTimePicker").value = time //moment(time, "HH:mm").format("h:mm A");
    document.getElementById("endTimeMenu").style.display = "none"; // Hide dropdown
    document.getElementById("confirmEndTime").style.display = "block";
}
