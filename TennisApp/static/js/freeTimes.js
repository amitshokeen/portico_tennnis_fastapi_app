function calculateFreeTimes(dayStart, dayEnd, busyDatesAndTimes) {
    // Helper function to convert "HH:mm" time to total minutes from midnight
    function parseTime(timeStr) {
        const [hours, minutes] = timeStr.split(':').map(Number);
        return hours * 60 + minutes;
    }

    // Helper function to format time as "HH:mm"
    function formatTime(minutes) {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
    }

    // Convert dayStart and dayEnd to total minutes from midnight
    const startOfDay = parseTime(dayStart);
    const endOfDay = parseTime(dayEnd);

    // Group busy times by date
    const groupedBusyTimes = {};
    busyDatesAndTimes.forEach(({ date, start_time, end_time }) => {
        if (!groupedBusyTimes[date]) groupedBusyTimes[date] = [];
        groupedBusyTimes[date].push({
            startTime: parseTime(start_time),
            endTime: parseTime(end_time)
        });
    });

    // Sort busy times for each date by start time
    for (const date in groupedBusyTimes) {
        groupedBusyTimes[date].sort((a, b) => a.startTime - b.startTime);
    }

    // Calculate free time slots
    const freeTimesJSON = [];
    for (const date in groupedBusyTimes) {
        let lastEnd = startOfDay;

        groupedBusyTimes[date].forEach(({ startTime, endTime }) => {
            if (lastEnd < startTime) {
                freeTimesJSON.push({
                    date: date,
                    from: formatTime(lastEnd),
                    to: formatTime(startTime)
                });
            }
            lastEnd = Math.max(lastEnd, endTime);
        });

        // Add free time from the last busy period to the end of the day
        if (lastEnd < endOfDay) {
            freeTimesJSON.push({
                date: date,
                from: formatTime(lastEnd),
                to: formatTime(endOfDay)
            });
        }
    }
    return freeTimesJSON;
}

/*
// Sample Input
const dayStart = "06:00";
const dayEnd = "22:00";

const busyDatesAndTimes = [
    { "date": "2025-02-10", "start_time": "16:30", "end_time": "17:00" },
    { "date": "2025-02-10", "start_time": "19:00", "end_time": "20:00" },
    { "date": "2025-02-11", "start_time": "06:30", "end_time": "07:30" },
    { "date": "2025-02-13", "start_time": "09:00", "end_time": "10:00" },
    { "date": "2025-02-13", "start_time": "18:30", "end_time": "19:30" },
    { "date": "2025-02-15", "start_time": "19:30", "end_time": "20:30" }
];

// Execute function
const freeTimesJSON = calculateFreeTimes(dayStart, dayEnd, busyDatesAndTimes);

// Log output
console.log(JSON.stringify(freeTimesJSON, null, 4));
*/

/*
Sample output:
freeTimesJSON = [
        { "date":"2025-02-10", "from": "06:00", "to": "16:30" },
        { "date":"2025-02-10", "from": "17:00", "to": "19:00" },
        { "date":"2025-02-10", "from": "20:00", "to": "22:00" },
        { "date":"2025-02-11", "from": "06:00", "to": "06:30" },
        { "date":"2025-02-11", "from": "07:30", "to": "22:00" }
]
*/

/*
    Purpose of the App: The web app must let logged-in users select a date, a start-time, and an end-time to book a Tennis court for playing. 

    Main Features: The app should not allow double booking, i.e., if a time slot is already booked, the same cannot be booked again by some other user. The booking is subject to the following rules: 
        1. Start Hour: 6:00 AM - This means the tennis court cannot be booked for a start time of earlier than 6:00 AM.
        2. End Hour: 10:00 PM - This meane the tennis court cannot be booked for an end time later than 10:00 PM.
        3. On Weekends and Public Holidays: No bookings allowed from 7:00 AM to 10:00 AM, and 5:00 PM to 8:00 PM.
        4. Bookings can be done upto 7 days in advance.
        5. Only one booking is allowed per day per user.
        6. Each booking duration must not exceed 90 mins.
        7. Users with Admin access can cancel any bookings and override all time related booking rules.
    
    Tech Stack: FastAPI for backend, HTML, CSS, JS for frontend, and SQLite for the database

    User Rules: Users to fill up and submit a registeration form on the web app. The admin user/s will receive an alert email about the registration request and update the DB to "activate" the user. (A proper interface to monitor/activate users to be created later.)

    Workflow: activated user login -> dashboard -> (Subject to rules) select a date, a start-time, an end-time -> Submit the form -> backend to verify booking request is as per rules and availability of the Tennis Court -> update the backend DB -> update a "blocked time slots" table in the frontend dashboard with info about username, date of booking, time of booking start, time of booking end.

    Ingtegrations: A third party API call to get a list of public holidays in the local region. If this is hard to get, then admin to make the list manually for each year.

*/