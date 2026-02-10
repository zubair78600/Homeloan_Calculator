let pieChart = null;

function calculateEMI() {
    const principal = parseFloat(document.getElementById('principal').value);
    const interestRate = parseFloat(document.getElementById('interest').value);
    const tenure = parseFloat(document.getElementById('tenure').value);
    const yearlyExtraEmi = parseFloat(document.getElementById('extraEmi').value) || 0;
    const hikePercentage = parseFloat(document.getElementById('hikePercentage').value) || 0;

    const monthlyInterestRate = interestRate / (12 * 100);
    const numberOfMonths = tenure * 12;

    // Calculate base EMI without hikes
    const baseEmi = principal * monthlyInterestRate * Math.pow(1 + monthlyInterestRate, numberOfMonths) /
        (Math.pow(1 + monthlyInterestRate, numberOfMonths) - 1);

    // Calculate standard loan without extra EMI or hikes for comparison
    let standardRemainingBalance = principal;
    let standardTotalInterestPaid = 0;

    for (let month = 1; month <= numberOfMonths && standardRemainingBalance > 0; month++) {
        const interestForMonth = standardRemainingBalance * monthlyInterestRate;
        let principalForMonth = baseEmi - interestForMonth;

        if (principalForMonth > standardRemainingBalance) {
            principalForMonth = standardRemainingBalance;
        }

        standardTotalInterestPaid += interestForMonth;
        standardRemainingBalance -= principalForMonth;
    }

    let remainingBalance = principal;
    let totalInterestPaid = 0;
    let currentEmi = baseEmi;
    let extraEmiForYear = 0;

    // Update table headers based on whether we have extra EMI or hike percentage
    const tableHead = document.querySelector('#emiTable thead tr');
    tableHead.innerHTML = `
        <th>Month</th>
        <th>EMI</th>
        <th>Principal</th>
        <th>Interest</th>
        <th>Balance</th>
        ${yearlyExtraEmi > 0 ? '<th>Extra</th>' : ''}
        ${hikePercentage > 0 ? '<th>Hike Amount</th>' : ''}
    `;

    const tableBody = document.querySelector('#emiTable tbody');
    tableBody.innerHTML = '';

    // Get start date from the date picker or use current date
    let startDate;
    const startDateInput = document.getElementById('startDate').value;

    if (startDateInput) {
        startDate = new Date(startDateInput);
    } else {
        // Default to current month if no date selected
        startDate = new Date();
        startDate.setDate(1); // Set to first day of current month
    }

    // For tracking year changes to apply hikes
    let currentYear = startDate.getFullYear();

    // Track hike amount and annual EMI
    let hikeAmount = 0;

    // For tracking how many years have passed for compounding hikes
    let yearsPassed = 0;

    for (let month = 1; month <= numberOfMonths && remainingBalance > 0; month++) {
        // Calculate current month date
        const currentDate = new Date(startDate);
        currentDate.setMonth(startDate.getMonth() + month - 1);

        // Check if we entered a new year (compared to loan start date)
        let isNewYear = false;
        if (currentDate.getFullYear() > currentYear) {
            currentYear = currentDate.getFullYear();
            isNewYear = true;
            yearsPassed++;
        }

        // Reset extra EMI at the start of each year
        if (isNewYear) {
            extraEmiForYear = yearlyExtraEmi;

            // Apply yearly EMI hike (compounded annually)
            if (hikePercentage > 0) {
                // Store previous EMI for calculating the hike amount
                const previousEmi = currentEmi;

                // Apply compound hike: baseEmi * (1 + hikePercentage/100)^yearsPassed
                currentEmi = baseEmi * Math.pow(1 + hikePercentage / 100, yearsPassed);

                // Calculate the hike amount for this specific annual increase
                hikeAmount = currentEmi - previousEmi;
            } else {
                hikeAmount = 0;
            }
        } else {
            // Reset hike amount for other months
            hikeAmount = 0;
        }

        const interestForMonth = remainingBalance * monthlyInterestRate;
        let principalForMonth = currentEmi - interestForMonth;

        // Add extra EMI if available for this year
        let extraEmiThisMonth = 0;
        if (extraEmiForYear > 0) {
            extraEmiThisMonth = Math.min(extraEmiForYear, remainingBalance - principalForMonth);
            principalForMonth += extraEmiThisMonth;
            extraEmiForYear -= extraEmiThisMonth;
        }

        // Adjust last EMI to not overpay
        if (principalForMonth > remainingBalance) {
            principalForMonth = remainingBalance;
            currentEmi = principalForMonth + interestForMonth;
            extraEmiThisMonth = 0;
        }

        totalInterestPaid += interestForMonth;
        remainingBalance -= principalForMonth;

        // Format the month name and year for display
        const monthName = currentDate.toLocaleString('en-US', { month: 'long' });
        const year = currentDate.getFullYear();
        const monthDisplay = `${monthName} ${year}`;

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${monthDisplay}</td>
            <td>${formatCurrency(currentEmi)}</td>
            <td>${formatCurrency(principalForMonth)}</td>
            <td>${formatCurrency(interestForMonth)}</td>
            <td>${formatCurrency(Math.max(0, remainingBalance))}</td>
            ${yearlyExtraEmi > 0 ? `<td>${formatCurrency(extraEmiThisMonth)}</td>` : ''}
            ${hikePercentage > 0 ? `<td>${formatCurrency(hikeAmount)}</td>` : ''}
        `;
        tableBody.appendChild(row);

        if (remainingBalance <= 0) break;
    }

    // Update summary
    const totalAmount = principal + totalInterestPaid;
    document.getElementById('totalPrincipal').textContent = formatCurrency(principal);
    document.getElementById('totalInterest').textContent = formatCurrency(totalInterestPaid);
    document.getElementById('totalAmount').textContent = formatCurrency(totalAmount);

    // Update dashboard payment summary
    document.getElementById('summaryPrincipal').textContent = formatCurrency(principal);
    document.getElementById('summaryInterest').textContent = formatCurrency(totalInterestPaid);
    document.getElementById('summaryAmount').textContent = formatCurrency(totalAmount);
    document.getElementById('monthlyEMI').textContent = formatCurrency(baseEmi);

    // Calculate and display savings information
    const interestSavedExtraEMI = yearlyExtraEmi > 0 ? standardTotalInterestPaid - totalInterestPaid : 0;
    const amountSavedHike = hikePercentage > 0 ? standardTotalInterestPaid - totalInterestPaid - interestSavedExtraEMI : 0;
    const totalSavings = interestSavedExtraEMI + amountSavedHike;

    // Show/hide and update total savings
    if (yearlyExtraEmi > 0 || hikePercentage > 0) {
        document.getElementById('totalSavingsItem').style.display = 'flex';
        document.getElementById('totalSavings').textContent = formatCurrency(totalSavings);
    } else {
        document.getElementById('totalSavingsItem').style.display = 'none';
    }

    // Calculate the actual number of payments (months) made
    const actualMonths = document.querySelectorAll('#emiTable tbody tr').length;
    document.getElementById('summaryMonths').textContent = actualMonths;
    document.getElementById('summaryYears').textContent = (actualMonths / 12).toFixed(1);

    // Update pie chart
    updatePieChart(principal, totalInterestPaid);

    // Update chart overlay values
    updateChartOverlay(principal, totalInterestPaid);
}

function updatePieChart(principal, totalInterest) {
    const ctx = document.getElementById('pieChart').getContext('2d');

    // Get colors from CSS variables
    const computedStyle = getComputedStyle(document.body);
    const principalColor = computedStyle.getPropertyValue('--c-principal').trim() || '#4a90e2';
    const interestColor = computedStyle.getPropertyValue('--c-interest').trim() || '#ff6b6b';

    // Destroy existing chart if it exists
    if (pieChart) {
        pieChart.destroy();
    }

    // Create new doughnut chart
    pieChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Principal', 'Interest'],
            datasets: [{
                data: [principal, totalInterest],
                backgroundColor: [
                    principalColor,
                    interestColor
                ],
                borderColor: 'transparent',
                borderWidth: 0,
                hoverBackgroundColor: [
                    principalColor,
                    interestColor
                ],
                hoverBorderColor: '#ffffff',
                hoverBorderWidth: 2,
                weight: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '72%', // Create the space for central glass effect
            animation: {
                animateScale: true,
                animateRotate: true,
                duration: 1200,
                easing: 'easeOutQuart'
            },
            layout: {
                padding: 10
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    enabled: true,
                    backgroundColor: 'rgba(0, 0, 0, 0.85)',
                    titleColor: '#ffffff',
                    bodyColor: '#ffffff',
                    padding: 12,
                    cornerRadius: 12,
                    displayColors: true,
                    usePointStyle: true,
                    boxPadding: 6,
                    callbacks: {
                        label: function (context) {
                            const label = context.label || '';
                            const value = context.parsed || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = Math.round((value / total) * 100);
                            return ` ${label}: ${formatCurrency(value)} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

// Debounce function for resize handler
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Add window resize handler with debouncing
window.addEventListener('resize', debounce(() => {
    if (pieChart) {
        pieChart.resize();
    }
}, 250));

function exportPDF() {
    const { jsPDF } = window.jspdf;

    // Get current parameter values
    const yearlyExtraEmi = parseFloat(document.getElementById('extraEmi').value) || 0;
    const hikePercentage = parseFloat(document.getElementById('hikePercentage').value) || 0;

    const doc = new jsPDF({
        unit: 'pt',
        format: 'a3',
        orientation: 'landscape'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 60;
    let yPos = margin;

    // Header Section
    doc.setFillColor(64, 139, 230);
    doc.rect(0, 0, pageWidth, 100, 'F');

    // Centered Title
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(36);
    const title = 'EMI Calculator Report';
    const titleWidth = doc.getTextWidth(title);
    const centerX = (pageWidth - titleWidth) / 2;
    doc.text(title, centerX, 60);

    // Timestamp
    const now = new Date();
    const timestamp = now.toLocaleString('en-IN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    });
    doc.setFontSize(12);
    doc.text(timestamp, pageWidth - margin - doc.getTextWidth(timestamp), 60);

    yPos = 140;

    // Create centered container for parameters and summary
    const containerWidth = 1000;
    const containerX = (pageWidth - containerWidth) / 2;

    // Left box - Loan Parameters
    const leftBoxWidth = 480;
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(220, 220, 220);
    doc.roundedRect(containerX, yPos, leftBoxWidth, 160, 5, 5, 'FD');

    // Parameters section
    doc.setTextColor(64, 139, 230);
    doc.setFontSize(18);
    doc.text('Loan Parameters', containerX + 20, yPos + 35);

    const params = [
        ['Principal Amount:', document.getElementById('principal').value.toLocaleString('en-IN')],
        ['Interest Rate:', `${document.getElementById('interest').value}%`],
        ['Loan Tenure:', `${document.getElementById('tenure').value} years`],
        ['Yearly Extra EMI:', document.getElementById('extraEmi').value.toLocaleString('en-IN')],
        ['Annual EMI Hike:', `${document.getElementById('hikePercentage').value}%`]
    ];

    doc.setFontSize(12);
    params.forEach((param, index) => {
        const y = yPos + 65 + (index * 22);
        doc.setTextColor(100, 100, 100);
        doc.setFont('helvetica', 'normal');
        doc.text(param[0], containerX + 30, y);
        doc.setTextColor(44, 62, 80);
        doc.setFont('helvetica', 'bold');
        doc.text(param[1], containerX + 180, y);
    });

    // Full-width Payment Summary Box
    yPos += 200;

    const summaryBoxWidth = containerWidth;
    const summaryBoxHeight = 200;
    const summaryBoxX = containerX;

    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(220, 220, 220);
    doc.roundedRect(summaryBoxX, yPos, summaryBoxWidth, summaryBoxHeight, 5, 5, 'FD');

    // Payment Summary Title
    doc.setTextColor(64, 139, 230);
    doc.setFontSize(18);
    const summaryTitle = 'Payment Summary';
    const summaryTitleWidth = doc.getTextWidth(summaryTitle);
    doc.text(summaryTitle, summaryBoxX + (summaryBoxWidth / 2) - (summaryTitleWidth / 2), yPos + 35);

    // Draw separator line
    doc.setDrawColor(220, 220, 220);
    doc.line(summaryBoxX + 20, yPos + 45, summaryBoxX + summaryBoxWidth - 20, yPos + 45);

    // Get all summary data
    const fullSummaryData = [
        { label: 'Total Principal:', value: document.getElementById('summaryPrincipal').textContent.replace('₹', '') },
        { label: 'Total Interest:', value: document.getElementById('summaryInterest').textContent.replace('₹', '') },
        { label: 'Total Amount:', value: document.getElementById('summaryAmount').textContent.replace('₹', '') },
        { label: 'Monthly EMI:', value: document.getElementById('monthlyEMI').textContent.replace('₹', '') },
        { label: 'Total Amount Saved:', value: (document.getElementById('totalSavings').textContent || '0').replace('₹', '') },
        { label: 'Number of Months:', value: document.getElementById('summaryMonths').textContent },
        { label: 'Number of Years:', value: document.getElementById('summaryYears').textContent }
    ];

    // Calculate positions for 2-row, multi-column layout
    const columnWidth = summaryBoxWidth / 3;

    // First row - 3 items
    for (let i = 0; i < 3; i++) {
        const x = summaryBoxX + (columnWidth * i) + (columnWidth / 2);
        const y = yPos + 80;

        doc.setTextColor(100, 100, 100);
        doc.setFont('helvetica', 'bold');
        const labelWidth = doc.getTextWidth(fullSummaryData[i].label);
        doc.text(fullSummaryData[i].label, x - (labelWidth / 2), y);

        doc.setTextColor(44, 62, 80);
        doc.setFont('helvetica', 'bold');
        const valueWidth = doc.getTextWidth(fullSummaryData[i].value);

        if (i === 2) {
            doc.setFillColor(232, 240, 254);
            const bgWidth = valueWidth + 20;
            doc.roundedRect(x - (bgWidth / 2), y + 10, bgWidth, 30, 3, 3, 'F');
            doc.setTextColor(64, 139, 230);
        }

        doc.text(fullSummaryData[i].value, x - (valueWidth / 2), y + 25);
    }

    // Second row - 4 items
    for (let i = 3; i < 7; i++) {
        let x;
        if (i === 5) {
            x = summaryBoxX + (columnWidth * 2) + (columnWidth / 4);
        } else if (i === 6) {
            x = summaryBoxX + (columnWidth * 2) + (columnWidth * 3 / 4);
        } else {
            x = summaryBoxX + (columnWidth * (i - 3)) + (columnWidth / 2);
        }

        const y = yPos + 140;

        doc.setTextColor(100, 100, 100);
        doc.setFont('helvetica', 'bold');
        const labelWidth = doc.getTextWidth(fullSummaryData[i].label);
        doc.text(fullSummaryData[i].label, x - (labelWidth / 2), y);

        doc.setTextColor(44, 62, 80);
        doc.setFont('helvetica', 'bold');
        const valueWidth = doc.getTextWidth(fullSummaryData[i].value);

        if (i === 4) {
            doc.setFillColor(232, 254, 240);
            const bgWidth = valueWidth + 20;
            doc.roundedRect(x - (bgWidth / 2), y + 10, bgWidth, 30, 3, 3, 'F');
            doc.setTextColor(39, 174, 96);
        }

        doc.text(fullSummaryData[i].value, x - (valueWidth / 2), y + 25);
    }

    yPos += summaryBoxHeight + 40;

    // EMI Details Table
    const table = document.getElementById('emiTable');
    const headers = Array.from(table.querySelectorAll('th')).map(th => th.textContent.trim());
    const rows = Array.from(table.querySelectorAll('tbody tr')).map(tr =>
        Array.from(tr.querySelectorAll('td')).map(td =>
            td.textContent.replace(/[₹,]/g, '').trim()
        )
    );

    const tableWidth = 1000;
    const tableX = (pageWidth - tableWidth) / 2;

    const columnStyles = {
        0: { cellWidth: 120 }
    };

    const totalColumns = headers.length;
    const remainingWidth = tableWidth - 120;
    const standardColumnWidth = Math.floor(remainingWidth / (totalColumns - 1));

    for (let i = 1; i < totalColumns; i++) {
        columnStyles[i] = { cellWidth: standardColumnWidth };
    }

    doc.autoTable({
        head: [headers],
        body: rows,
        startY: yPos,
        theme: 'grid',
        styles: {
            font: 'helvetica',
            fontSize: 11,
            cellPadding: 10,
            halign: 'center',
            valign: 'middle',
            lineColor: [220, 220, 220],
            lineWidth: 0.5
        },
        headStyles: {
            fillColor: [64, 139, 230],
            textColor: [255, 255, 255],
            fontSize: 12,
            fontStyle: 'bold',
            halign: 'center',
            cellPadding: 12
        },
        columnStyles: columnStyles,
        alternateRowStyles: {
            fillColor: [248, 248, 248]
        },
        margin: {
            left: tableX,
            right: tableX
        },
        tableWidth: tableWidth
    });

    doc.save('EMI_Calculator_Report.pdf');
}

function exportExcel() {
    const wb = XLSX.utils.book_new();

    const summaryData = [
        ['EMI Calculator Report'],
        [''],
        ['Summary'],
        ['Principal Amount', document.getElementById('totalPrincipal').textContent],
        ['Total Interest', document.getElementById('totalInterest').textContent],
        ['Total Amount:', document.getElementById('totalAmount').textContent],
        [''],
        ['EMI Details'],
        ['']
    ];

    const table = document.getElementById('emiTable');
    const headers = Array.from(table.querySelectorAll('th')).map(th => th.textContent);
    const rows = Array.from(table.querySelectorAll('tbody tr')).map(tr =>
        Array.from(tr.querySelectorAll('td')).map(td => td.textContent)
    );

    const wsData = [
        ...summaryData,
        headers,
        ...rows
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);

    const yearlyExtraEmi = parseFloat(document.getElementById('extraEmi').value) || 0;
    const hikePercentage = parseFloat(document.getElementById('hikePercentage').value) || 0;

    const colWidths = [
        { wch: 20 },
        { wch: 15 },
        { wch: 15 },
        { wch: 15 },
        { wch: 15 }
    ];

    if (yearlyExtraEmi > 0) {
        colWidths.push({ wch: 15 });
    }

    if (hikePercentage > 0) {
        colWidths.push({ wch: 15 });
    }

    ws['!cols'] = colWidths;

    XLSX.utils.book_append_sheet(wb, ws, 'EMI Calculator');

    XLSX.writeFile(wb, 'EMI_Calculator_Report.xlsx');
}

// Format currency for display
function formatCurrency(value) {
    return '₹' + Math.round(value).toLocaleString('en-IN');
}

// Update chart overlay
function updateChartOverlay(principal, totalInterest) {
    const total = principal + totalInterest;
    if (total === 0) return;

    const principalPercentage = Math.round((principal / total) * 100);
    const interestPercentage = 100 - principalPercentage; // Ensure total is exactly 100%

    const princPercEl = document.querySelector('.principal-percentage');
    const princAmtEl = document.querySelector('.principal-amount');
    const intPercEl = document.querySelector('.interest-percentage');
    const intAmtEl = document.querySelector('.interest-amount');

    if (princPercEl) princPercEl.textContent = `${principalPercentage}%`;
    if (princAmtEl) princAmtEl.textContent = formatCurrency(principal);
    if (intPercEl) intPercEl.textContent = `${interestPercentage}%`;
    if (intAmtEl) intAmtEl.textContent = formatCurrency(totalInterest);
}

// Add input event listeners
function addInputListeners() {
    const inputPairs = [
        { number: 'principal', slider: 'principalSlider' },
        { number: 'interest', slider: 'interestSlider' },
        { number: 'tenure', slider: 'tenureSlider' },
        { number: 'extraEmi', slider: 'extraEmiSlider' },
        { number: 'hikePercentage', slider: 'hikeSlider' }
    ];

    inputPairs.forEach(pair => {
        const numberInput = document.getElementById(pair.number);
        const sliderInput = document.getElementById(pair.slider);

        numberInput.addEventListener('input', () => {
            sliderInput.value = numberInput.value;
            updateSliderBackground(sliderInput);
            calculateEMI();
        });

        sliderInput.addEventListener('input', () => {
            numberInput.value = sliderInput.value;
            updateSliderBackground(sliderInput);
            calculateEMI();
        });

        updateSliderBackground(sliderInput);
    });
}

function updateSliderBackground(slider) {
    const value = (slider.value - slider.min) / (slider.max - slider.min) * 100;
    const computedStyle = getComputedStyle(document.documentElement);
    const actionColor = computedStyle.getPropertyValue('--c-action').trim() || '#0052f5';
    slider.style.background = `linear-gradient(to right, ${actionColor} 0%, ${actionColor} ${value}%, color-mix(in srgb, var(--c-glass) 18%, transparent) ${value}%, color-mix(in srgb, var(--c-glass) 18%, transparent) 100%)`;
}


// Track previous selected option for switcher animation
function trackPrevious(el) {
    const radios = el.querySelectorAll('input[type="radio"]');
    let previousValue = null;

    // init first select
    const initiallyChecked = el.querySelector('input[type="radio"]:checked');
    if (initiallyChecked) {
        previousValue = initiallyChecked.getAttribute("c-option");
        el.setAttribute("c-previous", previousValue);
    }

    radios.forEach((radio) => {
        radio.addEventListener("change", () => {
            if (radio.checked) {
                el.setAttribute("c-previous", previousValue ?? "");
                previousValue = radio.getAttribute("c-option");
            }
        });
    });
}

// Theme switching
function initThemeSwitcher() {
    const switcher = document.querySelector(".switcher");
    if (switcher) trackPrevious(switcher);

    const themeRadios = document.querySelectorAll('.switcher__input');

    themeRadios.forEach(radio => {
        radio.addEventListener('change', () => {
            if (radio.checked) {
                const theme = radio.value;

                // Update data-theme attribute on document root
                document.documentElement.setAttribute('data-theme', theme);

                // Update chart colors after theme change
                setTimeout(() => {
                    const principalValue = parseFloat(document.getElementById('principal').value);
                    const summaryInterestEl = document.getElementById('summaryInterest');
                    if (summaryInterestEl) {
                        const totalInterestValue = parseFloat(summaryInterestEl.textContent.replace(/[₹,]/g, ''));
                        if (!isNaN(principalValue) && !isNaN(totalInterestValue)) {
                            updatePieChart(principalValue, totalInterestValue);
                        }
                    }

                    // Update all slider backgrounds
                    const sliders = document.querySelectorAll('input[type="range"]');
                    sliders.forEach(updateSliderBackground);
                }, 100);
            }
        });
    });
}


// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Set default date to today
    const today = new Date();
    const dateString = today.toISOString().split('T')[0];
    document.getElementById('startDate').value = dateString;

    // Add listener for date change
    document.getElementById('startDate').addEventListener('change', calculateEMI);

    addInputListeners();
    initThemeSwitcher();

    // Initialize table headers
    const yearlyExtraEmi = parseFloat(document.getElementById('extraEmi').value) || 0;
    const hikePercentage = parseFloat(document.getElementById('hikePercentage').value) || 0;

    const tableHead = document.querySelector('#emiTable thead tr');
    tableHead.innerHTML = `
        <th>Month</th>
        <th>EMI</th>
        <th>Principal</th>
        <th>Interest</th>
        <th>Balance</th>
        ${yearlyExtraEmi > 0 ? '<th>Extra</th>' : ''}
        ${hikePercentage > 0 ? '<th>Hike Amount</th>' : ''}
    `;

    calculateEMI();
});
