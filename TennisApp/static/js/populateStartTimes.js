function populateStartTimes(START_HOUR, END_HOUR, TIME_INTERVAL, selectedDate, freeTimesJSON) {
    
    console.log("Inside populateStartTimes function. Value of startFilter: ", startFilter);

    const startTimeMenu = document.getElementById("startTimeMenu");
    startTimeMenu.innerHTML = ""; // Clear existing options

    // Helper function to convert "HH:mm" to total minutes from midnight
    const parseTime = (timeStr) => {
        const [hours, minutes] = timeStr.split(":").map(Number);
        return hours * 60 + minutes;
    };

    // Helper function to format time as "h:mm A"
    const formatTime = (minutes) => {
        return moment().startOf('day').add(minutes, 'minutes').format("h:mm A");
    };

    // Convert START_HOUR and END_HOUR to minutes from midnight
    const startLimit = parseTime(START_HOUR);
    const endLimit = parseTime(END_HOUR);

    console.log("Selected Date:", selectedDate);
    console.log("Start Limit:", startLimit, "End Limit:", endLimit);

    let allTimes = []; // Array to collect all time values

    // Find free times for the selected date
    const selectedFreeTimes = freeTimesJSON.filter(slot => slot.date === selectedDate);

    // If no free times found, assume the entire day is free
    if (selectedFreeTimes.length === 0) {
        console.log("No free times found for", selectedDate, "- Assuming all times are free.");

        for (let minutes = startLimit; minutes < endLimit; minutes += TIME_INTERVAL) {
            allTimes.push(formatTime(minutes)); // Store formatted time
        }
    } else {
        console.log("Free time slots found for", selectedDate);

        selectedFreeTimes.forEach(({ from, to }) => {
            let startMinutes = Math.max(parseTime(from), startLimit);
            let endMinutes = Math.min(parseTime(to), endLimit);

            console.log(`Populating times between ${formatTime(startMinutes)} - ${formatTime(endMinutes)}`);

            for (let minutes = startMinutes; minutes < endMinutes; minutes += TIME_INTERVAL) {
                allTimes.push(formatTime(minutes)); // Store formatted time
            }
        });
    }

    // Step 1: Filter times based on startFilter (Remove AM/PM values accordingly)
    const filteredTimes = allTimes.filter(time => {
        const isAM = time.includes("AM");
        return (startFilter === "AM" && isAM) || (startFilter === "PM" && !isAM);
    });

    // Step 2: Populate the startTimeMenu dropdown with filtered values
    if (filteredTimes.length > 0) {
        filteredTimes.forEach(timeValue => {
            const timeOption = document.createElement("div");
            timeOption.textContent = timeValue;
            timeOption.onclick = () => selectStartTime(timeValue);
            timeOption.classList.add("p-2", "cursor-pointer", "hover:bg-gray-200"); // Tailwind styles
            startTimeMenu.appendChild(timeOption);
        });
    } else {
        startTimeMenu.innerHTML = "<div class='p-2 text-gray-500'>No available times</div>";
    }

    console.log("Start times populated successfully.");
}

function selectStartTime(time) {
    document.getElementById("startTimePicker").value = time
    document.getElementById("startTimeMenu").style.display = "none"; // Hide dropdown

    document.getElementById("endTimePicker").value = ""; // Reset end time
    console.log("value of 'time' passed to selectStartTime: ", time)
    populateEndTimes(END_HOUR, TIME_INTERVAL, selectedDate, freeTimesJSON, time);
}
