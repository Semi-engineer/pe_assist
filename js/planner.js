document.addEventListener('DOMContentLoaded', () => {
    // Tab Elements
    const projectTab = document.getElementById('project-tab');
    const orderTab = document.getElementById('order-tab');
    const projectSection = document.getElementById('project-section');
    const orderSection = document.getElementById('order-section');

    // Project Form Elements
    const projectForm = document.getElementById('project-form');
    const projectTableBody = document.querySelector('#project-table tbody');
    const progressInput = document.getElementById('progress');
    const progressValueSpan = document.getElementById('progress-value');
    let projects = [];

    // Order Form Elements
    const orderForm = document.getElementById('order-form');
    const ordersTableBody = document.querySelector('#orders-table tbody');
    const chartCanvas = document.getElementById('schedule-chart');
    const ctx = chartCanvas.getContext('2d');
    let orders = [];

    // Save/Load Elements
    const saveBtn = document.getElementById('save-btn');
    const loadBtn = document.getElementById('load-btn');
    const loadFile = document.getElementById('load-file');

    // --- Tab Switching Logic ---
    function switchTab(tab) {
        if (tab === 'project') {
            projectTab.classList.add('active');
            orderTab.classList.remove('active');
            projectSection.classList.add('active');
            orderSection.classList.remove('active');
        } else {
            projectTab.classList.remove('active');
            orderTab.classList.add('active');
            projectSection.classList.remove('active');
            orderSection.classList.add('active');
        }
    }

    projectTab.addEventListener('click', () => switchTab('project'));
    orderTab.addEventListener('click', () => switchTab('order'));

    // --- Project Schedule Logic ---
    progressInput.addEventListener('input', () => {
        progressValueSpan.textContent = `${progressInput.value}%`;
    });

    function renderProjectTable() {
        projectTableBody.innerHTML = '';
        projects.forEach((project, index) => {
            const row = document.createElement('tr');
            const statusClass = project.status.toLowerCase().replace(' ', '-');
            row.innerHTML = `
                <td>${project.projectName}</td>
                <td>${project.startDate}</td>
                <td>${project.endDate}</td>
                <td><span class="status-badge ${statusClass}">${project.status}</span></td>
                <td>
                    <div class="progress-bar-container">
                        <div class="progress-bar" style="width: ${project.progress}%"></div>
                    </div>
                    ${project.progress}%
                </td>
                <td><button onclick="deleteProject(${index})">ลบ</button></td>
            `;
            projectTableBody.appendChild(row);
        });
    }

    projectForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const newProject = {
            projectName: document.getElementById('projectName').value,
            startDate: document.getElementById('startDate').value,
            endDate: document.getElementById('endDate').value,
            status: document.getElementById('status').value,
            progress: parseInt(document.getElementById('progress').value)
        };
        projects.push(newProject);
        renderProjectTable();
        projectForm.reset();
        progressValueSpan.textContent = `0%`;
    });

    window.deleteProject = function(index) {
        projects.splice(index, 1);
        renderProjectTable();
    };

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
        const totalHeight = (barHeight + barPadding) * orders.length;
        const chartHeight = Math.max(totalHeight, chartCanvas.height);
        chartCanvas.height = chartHeight;

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
    saveBtn.addEventListener('click', () => {
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
                    renderProjectTable();
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

    // Initial render
    switchTab('project');
});