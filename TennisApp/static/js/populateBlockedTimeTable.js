// Function to display blocked time slots in the table
function populateBlockedTimeTable(busy) {
    console.log("populateBlockedTimeTable has been fired")
    const tableBody = document.getElementById("blockedTimeTable");
    tableBody.innerHTML = ""; // Clear existing rows

    busy.forEach(period => {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td class="border border-gray-300 px-2 py-1">${period.user_name}</td>
            <td class="border border-gray-300 px-2 py-1">${moment(period.date).format("DD MMM YYYY")}</td>
            <td class="border border-gray-300 px-2 py-1">${moment(period.start_time, "HH:mm").format("h:mm A")}</td>
            <td class="border border-gray-300 px-2 py-1">${moment(period.end_time, "HH:mm").format("h:mm A")}</td>
        `;
        tableBody.appendChild(row);
    });
}
