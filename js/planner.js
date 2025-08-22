document.addEventListener('DOMContentLoaded', () => {
    // Tab Elements
    const projectTab = document.getElementById('project-tab');
    const orderTab = document.getElementById('order-tab');
    const projectSection = document.getElementById('project-section');
    const orderSection = document.getElementById('order-section');

    // Project Form Elements
    const projectForm = document.getElementById('project-form');
    const projectChartCanvas = document.getElementById('project-chart');
    const projectCtx = projectChartCanvas.getContext('2d');
    let projects = [];

    // Order Form Elements
    const orderForm = document.getElementById('order-form');
    const ordersTableBody = document.querySelector('#orders-table tbody');
    const chartCanvas = document.getElementById('schedule-chart');
    const ctx = chartCanvas.getContext('2d');
    let orders = [];

    // Save/Load Elements
    const saveDataBtn = document.getElementById('save-data-btn');
    const loadBtn = document.getElementById('load-btn');
    const loadFile = document.getElementById('load-file');
    const savePdfBtn = document.getElementById('save-pdf-btn');

    // --- Tab Switching Logic ---
    function switchTab(tab) {
        if (tab === 'project') {
            projectTab.classList.add('active');
            orderTab.classList.remove('active');
            projectSection.classList.add('active');
            orderSection.classList.remove('active');
            drawProjectGanttChart();
        } else {
            projectTab.classList.remove('active');
            orderTab.classList.add('active');
            projectSection.classList.remove('active');
            orderSection.classList.add('active');
            renderOrderTable();
        }
    }

    projectTab.addEventListener('click', () => switchTab('project'));
    orderTab.addEventListener('click', () => switchTab('order'));

    // --- Project Schedule Logic (Gantt Chart) ---
    function drawProjectGanttChart() {
        projectCtx.clearRect(0, 0, projectChartCanvas.width, projectChartCanvas.height);
        
        const barHeight = 25;
        const barPadding = 15;
        const totalHeight = (barHeight + barPadding) * projects.length + 50;
        projectChartCanvas.height = totalHeight;
        projectChartCanvas.width = 900;

        // Calculate time scale
        const allDates = projects.flatMap(p => [new Date(p.startDate), new Date(p.endDate)]);
        if (allDates.length === 0) return;

        const minDate = new Date(Math.min(...allDates));
        const maxDate = new Date(Math.max(...allDates));
        const totalDays = (maxDate - minDate) / (1000 * 60 * 60 * 24);
        const scaleFactor = (projectChartCanvas.width - 150) / totalDays;
        
        // Draw timeline
        projectCtx.fillStyle = '#666';
        projectCtx.font = '12px Arial';
        const dayInterval = Math.ceil(totalDays / 10);
        for(let i = 0; i <= totalDays; i += dayInterval) {
            const date = new Date(minDate);
            date.setDate(minDate.getDate() + i);
            const x = 100 + i * scaleFactor;
            projectCtx.fillText(date.toLocaleDateString('th-TH', { month: 'short', day: 'numeric' }), x, 20);
            projectCtx.strokeStyle = '#e0e0e0';
            projectCtx.beginPath();
            projectCtx.moveTo(x, 30);
            projectCtx.lineTo(x, totalHeight);
            projectCtx.stroke();
        }

        // Draw tasks
        projects.forEach((project, index) => {
            const startDate = new Date(project.startDate);
            const endDate = new Date(project.endDate);
            const startDay = (startDate - minDate) / (1000 * 60 * 60 * 24);
            const durationDays = (endDate - startDate) / (1000 * 60 * 60 * 24);

            const x = 100 + startDay * scaleFactor;
            const y = 30 + index * (barHeight + barPadding);
            const width = durationDays * scaleFactor;

            // Bar color based on status
            let barColor = '';
            if (project.status === 'To Do') barColor = '#f1c40f';
            else if (project.status === 'In Progress') barColor = '#3498db';
            else if (project.status === 'Completed') barColor = '#2ecc71';

            projectCtx.fillStyle = barColor;
            projectCtx.fillRect(x, y, width, barHeight);

            projectCtx.fillStyle = '#333';
            projectCtx.font = '14px Arial';
            projectCtx.fillText(project.taskName, 5, y + barHeight / 2 + 5);

            // Add delete button
            const deleteBtnX = projectChartCanvas.width - 40;
            const deleteBtnY = y + barHeight / 2;
            projectCtx.fillStyle = '#e74c3c';
            projectCtx.fillRect(deleteBtnX - 15, deleteBtnY - 10, 30, 20);
            projectCtx.fillStyle = '#fff';
            projectCtx.fillText('X', deleteBtnX - 5, deleteBtnY + 5);
        });
    }

    projectForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const newProject = {
            taskName: document.getElementById('taskName').value,
            startDate: document.getElementById('startDate').value,
            duration: parseInt(document.getElementById('duration').value),
            status: document.getElementById('status').value,
            endDate: new Date(new Date(document.getElementById('startDate').value).getTime() + parseInt(document.getElementById('duration').value) * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
        };
        projects.push(newProject);
        drawProjectGanttChart();
        projectForm.reset();
    });

    // --- Order Schedule Logic ---
    function renderOrderTable() {
        ordersTableBody.innerHTML = '';
        orders.forEach((order, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${order.orderId}</td>
                <td>${order.productName}</td>
                <td>${order.quantity}</td>
                <td><button onclick="deleteOrder(${index})">ลบ</button></td>
            `;
            ordersTableBody.appendChild(row);
        });
        drawGanttChart();
    }

    function drawGanttChart() {
        ctx.clearRect(0, 0, chartCanvas.width, chartCanvas.height);
        
        const barHeight = 20;
        const barPadding = 10;
        const totalHeight = (barHeight + barPadding) * orders.length + 50;
        chartCanvas.height = totalHeight;

        let currentX = 50;
        const totalProcessingTime = orders.reduce((sum, order) => sum + order.processingTime, 0);
        const scaleFactor = totalProcessingTime > 0 ? (chartCanvas.width - 100) / totalProcessingTime : 0;

        orders.forEach((order, index) => {
            const barWidth = order.processingTime * scaleFactor;
            const barY = index * (barHeight + barPadding) + 30;

            ctx.fillStyle = `hsl(${index * 50}, 70%, 50%)`;
            ctx.fillRect(currentX, barY, barWidth, barHeight);

            ctx.fillStyle = '#fff';
            ctx.fillText(order.orderId, currentX + 5, barY + 15);
            
            ctx.fillStyle = '#333';
            ctx.fillText(order.orderId, 5, barY + 15);

            const endTime = currentX + barWidth;
            ctx.fillText(Math.round(endTime / scaleFactor) + ' min', endTime + 5, barY + 15);

            currentX += barWidth;
        });
    }

    orderForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const newOrder = {
            orderId: document.getElementById('orderId').value,
            productName: document.getElementById('productName').value,
            quantity: parseInt(document.getElementById('quantity').value),
            processingTime: parseInt(document.getElementById('processingTime').value)
        };
        orders.push(newOrder);
        renderOrderTable();
        orderForm.reset();
    });

    window.deleteOrder = function(index) {
        orders.splice(index, 1);
        renderOrderTable();
    };

    // --- Save/Load Logic (Common for both) ---
    saveDataBtn.addEventListener('click', () => {
        const activeTab = projectSection.classList.contains('active') ? 'project' : 'order';
        const dataToSave = activeTab === 'project' ? projects : orders;
        const fileName = activeTab === 'project' ? 'project_schedule.json' : 'order_schedule.json';

        const dataStr = JSON.stringify(dataToSave, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        alert('ข้อมูลถูกบันทึกเรียบร้อย');
    });

    loadBtn.addEventListener('click', () => {
        loadFile.click();
    });

    loadFile.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const loadedData = JSON.parse(event.target.result);
                const activeTab = projectSection.classList.contains('active') ? 'project' : 'order';
                if (activeTab === 'project') {
                    projects = loadedData;
                    drawProjectGanttChart();
                } else {
                    orders = loadedData;
                    renderOrderTable();
                }
                alert('ข้อมูลถูกโหลดเรียบร้อย');
            } catch (error) {
                alert('ไม่สามารถโหลดไฟล์ได้ กรุณาตรวจสอบไฟล์อีกครั้ง');
            }
        };
        reader.readAsText(file);
    });

    // --- Save as PDF Logic ---
    savePdfBtn.addEventListener('click', () => {
        const activeTab = projectSection.classList.contains('active') ? 'project' : 'order';
        let elementToCapture;
        let fileName;

        if (activeTab === 'project') {
            elementToCapture = document.getElementById('project-chart');
            fileName = 'project_schedule.pdf';
        } else {
            elementToCapture = document.getElementById('orders-table');
            fileName = 'order_schedule.pdf';
        }
        
        html2canvas(elementToCapture).then(canvas => {
            const imgData = canvas.toDataURL('image/png');
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF('p', 'mm', 'a4');
            const imgWidth = 210; 
            const imgHeight = canvas.height * imgWidth / canvas.width;
            
            pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
            pdf.save(fileName);
        });
    });

    // Initial render
    switchTab('project');
});