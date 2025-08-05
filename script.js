// SmartSpin2k PowerTable Builder
// Interactive Power Curve Editor

class PowerTableBuilder {
    constructor() {
        this.data = new Map(); // cadence -> Map(watts -> resistance)
        this.originalData = new Map(); // Store original data for overlay
        this.showingOriginal = false;
        this.originalOpacity = 37; // Default opacity percentage
        this.maxResistance = 32029;
        this.tableMultiplier = 10;
        this.activeCadence = null;
        this.chart = null;
        this.cadenceColors = [
            '#9C27B0', // Purple
            '#3F51B5', // Indigo
            '#2196F3', // Blue
            '#00BCD4', // Cyan
            '#009688', // Teal
            '#4CAF50', // Green
            '#8BC34A', // Lime
            '#FF9800', // Orange
            '#F44336', // Red
            '#E91E63'  // Pink
        ];
        this.editingPoint = null;
        
        // Undo/Redo system
        this.history = [];
        this.historyIndex = -1;
        this.maxHistorySize = 50;
        
        this.initializeEventListeners();
        this.initializeChart();
        this.updateStatus('Ready - Upload a .ptab file to begin');
        
        // Add window resize handler for responsive chart
        window.addEventListener('resize', () => {
            if (this.chart) {
                this.chart.resize();
            }
        });
    }

    initializeEventListeners() {
        // File upload
        document.getElementById('file-upload').addEventListener('change', (e) => {
            this.handleFileUpload(e.target.files[0]);
        });

        // Download button
        document.getElementById('download-btn').addEventListener('click', () => {
            this.downloadTable();
        });

        // Max resistance input
        document.getElementById('max-resistance').addEventListener('change', (e) => {
            this.maxResistance = parseInt(e.target.value);
            this.updateChartMaxY();
            this.updateStatus('Max resistance updated');
        });

        // Table multiplier input
        document.getElementById('table-multiplier').addEventListener('change', (e) => {
            this.tableMultiplier = parseInt(e.target.value);
            this.updateChart();
            this.updateStatus('Table multiplier updated');
        });

        // SmartFill button
        document.getElementById('smart-fill-btn').addEventListener('click', () => {
            this.smartFillTable();
        });

        // Resolve Conflicts button
        document.getElementById('resolve-conflicts-btn').addEventListener('click', () => {
            this.resolveConflicts();
        });

        // SmartSmooth button
        document.getElementById('smart-smooth-btn').addEventListener('click', () => {
            this.smartSmoothTable();
        });

        // Toggle Original button
        document.getElementById('toggle-original-btn').addEventListener('click', () => {
            this.toggleOriginalOverlay();
        });

        // Original opacity slider
        document.getElementById('original-opacity').addEventListener('input', (e) => {
            this.updateOriginalOpacity(parseInt(e.target.value));
        });

        // Undo button
        document.getElementById('undo-btn').addEventListener('click', () => {
            this.undo();
        });

        // Redo button
        document.getElementById('redo-btn').addEventListener('click', () => {
            this.redo();
        });

        // Zoom control buttons
        document.getElementById('zoom-in-btn').addEventListener('click', () => {
            this.zoomIn();
        });

        document.getElementById('zoom-out-btn').addEventListener('click', () => {
            this.zoomOut();
        });

        document.getElementById('reset-zoom-btn').addEventListener('click', () => {
            this.resetZoom();
        });

        // Point editor controls
        document.getElementById('save-point').addEventListener('click', () => {
            this.savePointEdit();
        });

        document.getElementById('delete-point').addEventListener('click', () => {
            this.deletePoint();
        });

        document.getElementById('cancel-edit').addEventListener('click', () => {
            this.cancelPointEdit();
        });
    }

    initializeChart() {
        const ctx = document.getElementById('power-chart').getContext('2d');
        
        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                datasets: []
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: false, // Disable all animations
                interaction: {
                    intersect: false,
                    mode: 'point'
                },
                plugins: {
                    title: {
                        display: true,
                        text: 'Power Curve - Resistance vs Watts by Cadence',
                        font: {
                            size: 16,
                            weight: 'bold'
                        },
                        color: '#e0e0e0'
                    },
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            color: '#e0e0e0'
                        }
                    },
                    tooltip: {
                        mode: 'point',
                        intersect: false,
                        callbacks: {
                            title: function(context) {
                                const point = context[0];
                                return `${point.dataset.label}`;
                            },
                            label: function(context) {
                                return [
                                    `Watts: ${context.parsed.x}W`,
                                    `Resistance: ${context.parsed.y}`
                                ];
                            }
                        }
                    },
                    zoom: {
                        zoom: {
                            wheel: {
                                enabled: true,
                                speed: 0.1
                            },
                            pinch: {
                                enabled: true
                            }
                        },
                        limits: {
                            x: {
                                min: 0, // Never allow negative watts
                                max: 1500
                            },
                            y: {
                                min: 0, // Never allow negative resistance
                                max: this.maxResistance + 5000
                            }
                        }
                    },
                    dragData: {
                        round: 0,
                        showTooltip: true,
                        onDragStart: (e, datasetIndex, index, value) => {
                            this.onDragStart(datasetIndex, index, value);
                        },
                        onDrag: (e, datasetIndex, index, value) => {
                            this.onDrag(datasetIndex, index, value);
                        },
                        onDragEnd: (e, datasetIndex, index, value) => {
                            this.onDragEnd(datasetIndex, index, value);
                        }
                    }
                },
                onClick: (event, elements) => {
                    this.handleChartClick(event, elements);
                },
                scales: {
                    x: {
                        type: 'linear',
                        position: 'bottom',
                        title: {
                            display: true,
                            text: 'Power (Watts)',
                            font: {
                                size: 14,
                                weight: 'bold'
                            },
                            color: '#e0e0e0'
                        },
                        min: 0,
                        max: 1200,
                        grid: {
                            display: true,
                            color: 'rgba(224, 224, 224, 0.1)'
                        },
                        ticks: {
                            color: '#b0b0b0'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Resistance',
                            font: {
                                size: 14,
                                weight: 'bold'
                            },
                            color: '#e0e0e0'
                        },
                        min: 0,
                        max: this.maxResistance,
                        grid: {
                            display: true,
                            color: 'rgba(224, 224, 224, 0.1)'
                        },
                        ticks: {
                            color: '#b0b0b0'
                        }
                    }
                }
            }
        });
    }

    async handleFileUpload(file) {
        if (!file || !file.name.endsWith('.ptab')) {
            this.showError('Please select a valid .ptab file');
            return;
        }

        try {
            const content = await this.readFileContent(file);
            this.parseTableData(content);
            this.updateChart();
            this.generateCadenceButtons();
            this.updateStatus(`Loaded: ${file.name}`);
            this.showSuccess('File loaded successfully');
        } catch (error) {
            this.showError(`Error loading file: ${error.message}`);
        }
    }

    readFileContent(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsText(file);
        });
    }

    parseTableData(content) {
        const lines = content.trim().split('\n');
        
        // Parse metadata to get max resistance
        const metadataLine = lines[0];
        if (metadataLine.startsWith('# METADATA:HMax=')) {
            const hMaxMatch = metadataLine.match(/HMax=(\d+)/);
            if (hMaxMatch) {
                this.maxResistance = parseInt(hMaxMatch[1]);
                document.getElementById('max-resistance').value = this.maxResistance;
            }
        }

        // Parse header to get power levels
        const headerLine = lines[1];
        const powerLevels = headerLine.split(',').slice(1).map(p => parseInt(p.replace('W', '')));

        // Clear existing data
        this.data.clear();

        // Parse data rows
        for (let i = 2; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            const cells = line.split(',');
            const cadence = parseInt(cells[0].replace('RPM', ''));
            
            if (isNaN(cadence)) continue;

            const cadenceData = new Map();
            
            for (let j = 1; j < cells.length && j <= powerLevels.length; j++) {
                const resistance = cells[j].trim();
                if (resistance && resistance !== '') {
                    const watts = powerLevels[j - 1];
                    const resistanceValue = parseInt(resistance) * this.tableMultiplier; // Apply multiplier when loading
                    
                    if (!isNaN(watts) && !isNaN(resistanceValue)) {
                        cadenceData.set(watts, resistanceValue);
                    }
                }
            }
            
            if (cadenceData.size > 0) {
                this.data.set(cadence, cadenceData);
            }
        }
        
        // Save initial state to history
        this.saveToHistory();
        
        // Store original data for overlay feature
        this.originalData.clear();
        for (const [cadence, cadenceData] of this.data) {
            this.originalData.set(cadence, new Map(cadenceData));
        }
    }

    updateChart() {
        // Store current zoom/pan state before updating
        const currentZoom = this.chart ? {
            x: this.chart.scales.x.min,
            xMax: this.chart.scales.x.max,
            y: this.chart.scales.y.min,
            yMax: this.chart.scales.y.max
        } : null;

        const datasets = [];
        let colorIndex = 0;

        // Sort cadences for consistent ordering
        const sortedCadences = Array.from(this.data.keys()).sort((a, b) => a - b);

        // Add original data as ghosted overlay if enabled
        if (this.showingOriginal && this.originalData.size > 0) {
            const originalSortedCadences = Array.from(this.originalData.keys()).sort((a, b) => a - b);
            
            for (const cadence of originalSortedCadences) {
                const originalCadenceData = this.originalData.get(cadence);
                const originalPoints = [];

                // Sort watts for proper line drawing
                const originalSortedWatts = Array.from(originalCadenceData.keys()).sort((a, b) => a - b);

                for (const watts of originalSortedWatts) {
                    originalPoints.push({
                        x: watts,
                        y: originalCadenceData.get(watts)
                    });
                }

                const color = this.cadenceColors[colorIndex % this.cadenceColors.length];

                // Convert opacity percentage to hex (0-100 to 00-FF)
                const opacityHex = Math.round((this.originalOpacity / 100) * 255).toString(16).padStart(2, '0');
                const lighterOpacityHex = Math.round((this.originalOpacity / 100) * 128).toString(16).padStart(2, '0');
                const pointOpacityHex = Math.round((this.originalOpacity / 100) * 180).toString(16).padStart(2, '0');

                datasets.push({
                    label: `${cadence} RPM (Original)`,
                    data: originalPoints,
                    borderColor: color + opacityHex,
                    backgroundColor: color + lighterOpacityHex,
                    pointBackgroundColor: color + pointOpacityHex,
                    pointBorderColor: color + opacityHex,
                    pointRadius: 3,
                    pointHoverRadius: 5,
                    borderWidth: 1,
                    borderDash: [5, 5], // Dashed line for original data
                    tension: 0.1,
                    dragData: false, // Disable dragging for original data
                    pointHitRadius: 0, // Disable clicking on original points
                    order: 2 // Render behind current data
                });

                colorIndex++;
            }
            
            // Reset color index for current data
            colorIndex = 0;
        }

        // Add current data
        for (const cadence of sortedCadences) {
            const cadenceData = this.data.get(cadence);
            const points = [];

            // Sort watts for proper line drawing
            const sortedWatts = Array.from(cadenceData.keys()).sort((a, b) => a - b);

            for (const watts of sortedWatts) {
                points.push({
                    x: watts,
                    y: cadenceData.get(watts)
                });
            }

            const color = this.cadenceColors[colorIndex % this.cadenceColors.length];
            const isActive = this.activeCadence === cadence;

            datasets.push({
                label: `${cadence} RPM`,
                data: points,
                borderColor: color,
                backgroundColor: color + '20',
                pointBackgroundColor: color,
                pointBorderColor: color,
                pointRadius: isActive ? 8 : 5,
                pointHoverRadius: isActive ? 10 : 7,
                borderWidth: isActive ? 3 : 2,
                tension: 0.1,
                dragData: true, // Enable drag for all datasets
                pointHitRadius: 10,
                order: 1 // Render in front of original data
            });

            colorIndex++;
        }

        this.chart.data.datasets = datasets;
        this.chart.update('none'); // Use 'none' mode to disable animations
        
        // Restore zoom state after update
        if (currentZoom && (
            currentZoom.x !== this.chart.scales.x.min ||
            currentZoom.xMax !== this.chart.scales.x.max ||
            currentZoom.y !== this.chart.scales.y.min ||
            currentZoom.yMax !== this.chart.scales.y.max
        )) {
            this.chart.zoomScale('x', {min: currentZoom.x, max: currentZoom.xMax}, 'none');
            this.chart.zoomScale('y', {min: currentZoom.y, max: currentZoom.yMax}, 'none');
        }
        
        this.updateChartMaxY();
    }

    updateChartMaxY() {
        this.chart.options.scales.y.max = this.maxResistance;
        // Update zoom limits when max resistance changes
        this.chart.options.plugins.zoom.limits.y.max = this.maxResistance + 5000;
        this.chart.update('none'); // Disable animation for Y-axis updates
    }

    generateCadenceButtons() {
        const container = document.getElementById('cadence-buttons');
        container.innerHTML = '';

        const sortedCadences = Array.from(this.data.keys()).sort((a, b) => a - b);
        let colorIndex = 0;

        for (const cadence of sortedCadences) {
            const button = document.createElement('button');
            const color = this.cadenceColors[colorIndex % this.cadenceColors.length];
            
            button.textContent = `${cadence} RPM`;
            button.className = 'cadence-btn';
            button.style.borderColor = color;
            button.style.color = color;
            
            button.addEventListener('click', () => {
                this.setActiveCadence(cadence);
            });

            container.appendChild(button);
            colorIndex++;
        }
    }

    setActiveCadence(cadence) {
        this.activeCadence = cadence;
        
        // Update button states
        const buttons = document.querySelectorAll('.cadence-btn');
        buttons.forEach((btn, index) => {
            const btnCadence = Array.from(this.data.keys()).sort((a, b) => a - b)[index];
            if (btnCadence === cadence) {
                btn.classList.add('active');
                btn.style.backgroundColor = btn.style.borderColor;
                btn.style.color = 'white';
            } else {
                btn.classList.remove('active');
                btn.style.backgroundColor = 'white';
                btn.style.color = btn.style.borderColor;
            }
        });

        // Update chart WITHOUT resetting zoom/pan position
        this.updateChart();
        this.updateStatus(`Active cadence: ${cadence} RPM`);
        document.getElementById('active-cadence').textContent = `Active: ${cadence} RPM`;
    }

    handleChartClick(event, elements) {
        if (!this.activeCadence) {
            this.showError('Please select a cadence line first');
            return;
        }

        if (elements.length > 0) {
            // Clicked on an existing point
            const element = elements[0];
            const dataset = this.chart.data.datasets[element.datasetIndex];
            const point = dataset.data[element.index];
            
            this.editPoint(this.activeCadence, point.x, point.y, element.index);
        } else {
            // Clicked on empty space - add new point at closest existing watt column
            const canvasPosition = Chart.helpers.getRelativePosition(event, this.chart);
            const dataX = this.chart.scales.x.getValueForPixel(canvasPosition.x);
            const dataY = this.chart.scales.y.getValueForPixel(canvasPosition.y);
            
            if (dataX >= 0 && dataY >= 0 && dataY <= this.maxResistance) {
                // Find all existing watt columns across all cadences
                const allWatts = new Set();
                for (const cadenceData of this.data.values()) {
                    for (const watts of cadenceData.keys()) {
                        allWatts.add(watts);
                    }
                }
                
                if (allWatts.size === 0) {
                    this.showError('No existing data points found. Please load a .ptab file first.');
                    return;
                }
                
                // Find the closest existing watt value
                const sortedWatts = Array.from(allWatts).sort((a, b) => a - b);
                let closestWatts = sortedWatts[0];
                let minDistance = Math.abs(dataX - closestWatts);
                
                for (const watts of sortedWatts) {
                    const distance = Math.abs(dataX - watts);
                    if (distance < minDistance) {
                        minDistance = distance;
                        closestWatts = watts;
                    }
                }
                
                this.addPoint(this.activeCadence, closestWatts, Math.round(dataY));
            }
        }
    }

    addPoint(cadence, watts, resistance) {
        if (!this.data.has(cadence)) {
            this.data.set(cadence, new Map());
        }

        const cadenceData = this.data.get(cadence);
        
        // Check if this point already exists
        if (cadenceData.has(watts)) {
            this.showError('Point already exists at this watt level');
            return;
        }

        // Save to history before making changes
        this.saveToHistory();

        // Find the closest known points for interpolation
        const interpolatedPoints = this.generateInterpolatedPoints(cadence, watts, resistance);
        
        // Add all interpolated points
        let addedCount = 0;
        for (const [w, r] of interpolatedPoints) {
            cadenceData.set(w, r);
            addedCount++;
        }

        this.updateChart();
        this.updateStatus(`Added ${addedCount} point(s) with linear interpolation`);
    }

    editPoint(cadence, watts, resistance, pointIndex) {
        this.editingPoint = { cadence, watts, resistance, pointIndex };
        
        document.getElementById('point-cadence').textContent = cadence;
        document.getElementById('point-watts').textContent = watts;
        document.getElementById('point-resistance').value = resistance;
        document.getElementById('point-editor').style.display = 'block';
    }

    savePointEdit() {
        if (!this.editingPoint) return;

        const newResistance = parseInt(document.getElementById('point-resistance').value);
        const { cadence, watts } = this.editingPoint;

        if (isNaN(newResistance) || newResistance < 0) {
            this.showError('Invalid resistance value');
            return;
        }

        // Save to history before making changes
        this.saveToHistory();

        // Apply collision avoidance and monotonicity
        const safeResistance = this.avoidCollisions(cadence, watts, newResistance);
        
        if (safeResistance !== newResistance) {
            this.showError(`Value adjusted to ${safeResistance} to maintain constraints`);
        }

        this.data.get(cadence).set(watts, safeResistance);
        this.updateChart();
        this.cancelPointEdit();
        this.updateStatus('Point updated successfully');
    }

    deletePoint() {
        if (!this.editingPoint) return;

        // Save to history before making changes
        this.saveToHistory();

        const { cadence, watts } = this.editingPoint;
        this.data.get(cadence).delete(watts);
        this.updateChart();
        this.cancelPointEdit();
        this.updateStatus('Point deleted');
    }

    cancelPointEdit() {
        this.editingPoint = null;
        document.getElementById('point-editor').style.display = 'none';
    }

    findInterpolatedCollision(otherCadenceData, watts, resistance) {
        // Find if the proposed point would intersect with a line segment from another cadence
        const otherWatts = Array.from(otherCadenceData.keys()).sort((a, b) => a - b);
        
        for (let i = 0; i < otherWatts.length - 1; i++) {
            const w1 = otherWatts[i];
            const w2 = otherWatts[i + 1];
            const r1 = otherCadenceData.get(w1);
            const r2 = otherCadenceData.get(w2);
            
            // Check if our watts falls between these two points
            if (watts > w1 && watts < w2) {
                // Linear interpolation to find resistance at our watts
                const ratio = (watts - w1) / (w2 - w1);
                const interpolatedResistance = r1 + (r2 - r1) * ratio;
                
                return Math.round(interpolatedResistance);
            }
        }
        
        return null;
    }

    enforceMonotonicity(cadence, watts, resistance) {
        const cadenceData = this.data.get(cadence);
        if (!cadenceData) return resistance;

        let adjustedResistance = resistance;

        // Check all existing points in this cadence line
        for (const [w, r] of cadenceData) {
            if (w < watts && r >= adjustedResistance) {
                // Point to the left has higher or equal resistance - adjust up
                adjustedResistance = r + 1;
            } else if (w > watts && r <= adjustedResistance) {
                // Point to the right has lower or equal resistance - adjust down
                adjustedResistance = r - 1;
            }
        }

        // Ensure we stay within bounds
        adjustedResistance = Math.max(0, Math.min(this.maxResistance, adjustedResistance));

        return adjustedResistance;
    }

    generateInterpolatedPoints(cadence, targetWatts, targetResistance) {
        const cadenceData = this.data.get(cadence);
        const existingWatts = Array.from(cadenceData.keys()).sort((a, b) => a - b);
        
        // Find the closest points on either side of the target
        let leftPoint = null;
        let rightPoint = null;
        
        for (const watts of existingWatts) {
            if (watts < targetWatts) {
                leftPoint = { watts, resistance: cadenceData.get(watts) };
            } else if (watts > targetWatts && !rightPoint) {
                rightPoint = { watts, resistance: cadenceData.get(watts) };
                break;
            }
        }
        
        const interpolatedPoints = new Map();
        
        // If we have both left and right points, interpolate between them
        if (leftPoint && rightPoint) {
            const startWatts = leftPoint.watts;
            const endWatts = rightPoint.watts;
            const startResistance = leftPoint.resistance;
            const endResistance = rightPoint.resistance;
            
            // Generate points at 30W intervals (common increment in power tables)
            const increment = 30;
            for (let w = startWatts + increment; w < endWatts; w += increment) {
                // Linear interpolation
                const ratio = (w - startWatts) / (endWatts - startWatts);
                let interpolatedResistance = Math.round(startResistance + (endResistance - startResistance) * ratio);
                
                // Apply collision avoidance
                interpolatedResistance = this.avoidCollisions(cadence, w, interpolatedResistance);
                
                interpolatedPoints.set(w, interpolatedResistance);
            }
        } 
        // If we only have a left point, extrapolate forward
        else if (leftPoint && !rightPoint) {
            // Use the target point to determine the slope
            const slope = (targetResistance - leftPoint.resistance) / (targetWatts - leftPoint.watts);
            
            const increment = 30;
            for (let w = leftPoint.watts + increment; w <= targetWatts; w += increment) {
                let extrapolatedResistance = Math.round(leftPoint.resistance + slope * (w - leftPoint.watts));
                
                // Apply collision avoidance
                extrapolatedResistance = this.avoidCollisions(cadence, w, extrapolatedResistance);
                
                interpolatedPoints.set(w, extrapolatedResistance);
            }
        }
        // If we only have a right point, extrapolate backward
        else if (!leftPoint && rightPoint) {
            // Use the target point to determine the slope
            const slope = (rightPoint.resistance - targetResistance) / (rightPoint.watts - targetWatts);
            
            const increment = 30;
            for (let w = targetWatts; w < rightPoint.watts; w += increment) {
                let extrapolatedResistance = Math.round(targetResistance + slope * (w - targetWatts));
                
                // Apply collision avoidance
                extrapolatedResistance = this.avoidCollisions(cadence, w, extrapolatedResistance);
                
                interpolatedPoints.set(w, extrapolatedResistance);
            }
        }
        // If no existing points, just add the target point
        else {
            let safeResistance = this.avoidCollisions(cadence, targetWatts, targetResistance);
            interpolatedPoints.set(targetWatts, safeResistance);
        }
        
        // Always include the target point (with collision avoidance)
        if (!interpolatedPoints.has(targetWatts)) {
            let safeResistance = this.avoidCollisions(cadence, targetWatts, targetResistance);
            interpolatedPoints.set(targetWatts, safeResistance);
        }
        
        return interpolatedPoints;
    }

    avoidCollisions(cadence, watts, proposedResistance) {
        // Check against all other cadence lines for collisions
        let safeResistance = proposedResistance;
        
        // Get all other cadences
        for (const [otherCadence, otherCadenceData] of this.data) {
            if (otherCadence === cadence) continue;
            
            // Check if this other cadence has a point at the same watts
            if (otherCadenceData.has(watts)) {
                const otherResistance = otherCadenceData.get(watts);
                
                // Determine which cadence should have higher resistance
                // Generally, higher cadence should have lower resistance for same power
                if (cadence > otherCadence) {
                    // Current cadence is higher, should have lower resistance
                    if (safeResistance >= otherResistance) {
                        safeResistance = otherResistance - 1;
                    }
                } else {
                    // Current cadence is lower, should have higher resistance
                    if (safeResistance <= otherResistance) {
                        safeResistance = otherResistance + 1;
                    }
                }
            }
            
            // Check interpolated collision points
            const interpolatedCollision = this.findInterpolatedCollision(otherCadenceData, watts, safeResistance);
            if (interpolatedCollision) {
                if (cadence > otherCadence) {
                    safeResistance = Math.min(safeResistance, interpolatedCollision - 1);
                } else {
                    safeResistance = Math.max(safeResistance, interpolatedCollision + 1);
                }
            }
        }
        
        // Ensure we don't go below 0 or above max resistance
        safeResistance = Math.max(0, Math.min(this.maxResistance, safeResistance));
        
        // Also check monotonicity within the same cadence line
        safeResistance = this.enforceMonotonicity(cadence, watts, safeResistance);
        
        return safeResistance;
    }

    // History management methods
    saveToHistory() {
        // Create a deep copy of the current data state
        const state = {
            data: new Map(),
            maxResistance: this.maxResistance,
            tableMultiplier: this.tableMultiplier
        };
        
        // Deep copy the data
        for (const [cadence, cadenceData] of this.data) {
            state.data.set(cadence, new Map(cadenceData));
        }
        
        // Remove any future history if we're not at the end
        if (this.historyIndex < this.history.length - 1) {
            this.history = this.history.slice(0, this.historyIndex + 1);
        }
        
        // Add new state to history
        this.history.push(state);
        
        // Limit history size
        if (this.history.length > this.maxHistorySize) {
            this.history.shift();
        } else {
            this.historyIndex++;
        }
        
        this.updateUndoRedoButtons();
    }

    undo() {
        if (this.historyIndex > 0) {
            this.historyIndex--;
            this.restoreFromHistory(this.history[this.historyIndex]);
            this.updateStatus('Undid last action');
        }
    }

    redo() {
        if (this.historyIndex < this.history.length - 1) {
            this.historyIndex++;
            this.restoreFromHistory(this.history[this.historyIndex]);
            this.updateStatus('Redid action');
        }
    }

    restoreFromHistory(state) {
        // Restore data
        this.data.clear();
        for (const [cadence, cadenceData] of state.data) {
            this.data.set(cadence, new Map(cadenceData));
        }
        
        // Restore settings
        this.maxResistance = state.maxResistance;
        this.tableMultiplier = state.tableMultiplier;
        
        // Update UI
        document.getElementById('max-resistance').value = this.maxResistance;
        document.getElementById('table-multiplier').value = this.tableMultiplier;
        
        this.updateChart();
        this.generateCadenceButtons();
        this.updateUndoRedoButtons();
    }

    updateUndoRedoButtons() {
        const undoBtn = document.getElementById('undo-btn');
        const redoBtn = document.getElementById('redo-btn');
        
        undoBtn.disabled = this.historyIndex <= 0;
        redoBtn.disabled = this.historyIndex >= this.history.length - 1;
    }

    smartFillTable() {
        if (this.data.size === 0) {
            this.showError('No data to fill. Please upload a .ptab file first.');
            return;
        }

        if (!confirm('SmartFill will automatically complete all missing data points at existing watt columns. This action can be undone. Continue?')) {
            return;
        }

        // Save current state to history
        this.saveToHistory();

        let totalPointsAdded = 0;
        let totalCellsChecked = 0;

        // Get all unique watt values across all cadences (existing columns only)
        const allWatts = new Set();
        for (const cadenceData of this.data.values()) {
            for (const watts of cadenceData.keys()) {
                allWatts.add(watts);
            }
        }
        
        if (allWatts.size === 0) {
            this.showError('No existing data points found to interpolate from.');
            return;
        }

        const sortedAllWatts = Array.from(allWatts).sort((a, b) => a - b);
        const sortedCadences = Array.from(this.data.keys()).sort((a, b) => a - b);

        console.log('SmartFill starting:', {
            totalWattColumns: sortedAllWatts.length,
            totalCadences: sortedCadences.length,
            wattColumns: sortedAllWatts,
            cadences: sortedCadences
        });

        // For each cadence, fill in missing data at existing watt columns
        for (const cadence of sortedCadences) {
            const cadenceData = this.data.get(cadence);
            const existingWatts = Array.from(cadenceData.keys()).sort((a, b) => a - b);
            
            if (existingWatts.length < 1) {
                console.log(`Skipping cadence ${cadence} - no existing data`);
                continue; // Need at least 1 point to work with
            }

            console.log(`Processing cadence ${cadence}:`, {
                existingPoints: existingWatts.length,
                existingWatts: existingWatts
            });

            // For each existing watt column in the global data
            for (const watts of sortedAllWatts) {
                totalCellsChecked++;
                
                // If this cadence doesn't have data at this watt level, calculate it
                if (!cadenceData.has(watts)) {
                    console.log(`Missing data at ${cadence}RPM @ ${watts}W - attempting to fill`);
                    
                    let interpolatedResistance = null;
                    
                    // Find the closest existing points for interpolation/extrapolation
                    let leftPoint = null;
                    let rightPoint = null;
                    
                    // Find left point (highest watt <= target)
                    for (const existingWatt of existingWatts) {
                        if (existingWatt <= watts) {
                            leftPoint = { watts: existingWatt, resistance: cadenceData.get(existingWatt) };
                        }
                    }
                    
                    // Find right point (lowest watt >= target)
                    for (const existingWatt of existingWatts) {
                        if (existingWatt >= watts) {
                            rightPoint = { watts: existingWatt, resistance: cadenceData.get(existingWatt) };
                            break;
                        }
                    }
                    
                    console.log(`Points found for ${watts}W:`, { leftPoint, rightPoint });
                    
                    if (leftPoint && rightPoint && leftPoint.watts !== rightPoint.watts) {
                        // Interpolation or extrapolation
                        const ratio = (watts - leftPoint.watts) / (rightPoint.watts - leftPoint.watts);
                        interpolatedResistance = Math.round(leftPoint.resistance + (rightPoint.resistance - leftPoint.resistance) * ratio);
                        console.log(`Calculated via interpolation: ${interpolatedResistance}`);
                    } else if (leftPoint && !rightPoint) {
                        // Extrapolate forward using slope from last two points
                        if (existingWatts.length >= 2) {
                            const prevIndex = existingWatts.length - 2;
                            const secondLastPoint = { 
                                watts: existingWatts[prevIndex], 
                                resistance: cadenceData.get(existingWatts[prevIndex]) 
                            };
                            const slope = (leftPoint.resistance - secondLastPoint.resistance) / (leftPoint.watts - secondLastPoint.watts);
                            interpolatedResistance = Math.round(leftPoint.resistance + slope * (watts - leftPoint.watts));
                            console.log(`Calculated via forward extrapolation: ${interpolatedResistance} (slope: ${slope})`);
                        }
                    } else if (!leftPoint && rightPoint) {
                        // Extrapolate backward using slope from first two points
                        if (existingWatts.length >= 2) {
                            const secondPoint = { 
                                watts: existingWatts[1], 
                                resistance: cadenceData.get(existingWatts[1]) 
                            };
                            const slope = (secondPoint.resistance - rightPoint.resistance) / (secondPoint.watts - rightPoint.watts);
                            interpolatedResistance = Math.round(rightPoint.resistance + slope * (watts - rightPoint.watts));
                            console.log(`Calculated via backward extrapolation: ${interpolatedResistance} (slope: ${slope})`);
                        }
                    } else if (leftPoint && rightPoint && leftPoint.watts === rightPoint.watts) {
                        // Same point - use that resistance
                        interpolatedResistance = leftPoint.resistance;
                        console.log(`Using exact match: ${interpolatedResistance}`);
                    }
                    
                    if (interpolatedResistance !== null) {
                        // Apply collision avoidance to ensure no line crossings
                        const originalResistance = interpolatedResistance;
                        interpolatedResistance = this.avoidCollisions(cadence, watts, interpolatedResistance);
                        
                        // Ensure we stay within bounds
                        interpolatedResistance = Math.max(0, Math.min(this.maxResistance, interpolatedResistance));
                        
                        console.log(`Final resistance after collision avoidance: ${interpolatedResistance} (was ${originalResistance})`);
                        
                        // Add the calculated point
                        cadenceData.set(watts, interpolatedResistance);
                        totalPointsAdded++;
                    } else {
                        console.log(`Could not calculate resistance for ${cadence}RPM @ ${watts}W`);
                    }
                }
            }
        }

        console.log('SmartFill completed:', {
            totalCellsChecked,
            totalPointsAdded
        });

        this.updateChart();
        this.updateStatus(`SmartFill completed: Added ${totalPointsAdded} data points (checked ${totalCellsChecked} cells)`);
        this.showSuccess(`SmartFill added ${totalPointsAdded} data points with collision avoidance`);
    }

    resolveConflicts() {
        if (this.data.size === 0) {
            this.showError('No data to resolve conflicts. Please upload a .ptab file first.');
            return;
        }

        if (!confirm('Resolve Conflicts will automatically fix monotonicity issues and line crossings by making minimal adjustments. This action can be undone. Continue?')) {
            return;
        }

        // Save current state to history
        this.saveToHistory();

        let totalAdjustments = 0;

        // Get all unique watt values
        const allWatts = new Set();
        for (const cadenceData of this.data.values()) {
            for (const watts of cadenceData.keys()) {
                allWatts.add(watts);
            }
        }
        const sortedWatts = Array.from(allWatts).sort((a, b) => a - b);

        // First pass: Fix monotonicity within each cadence line
        for (const [cadence, cadenceData] of this.data) {
            const cadenceWatts = Array.from(cadenceData.keys()).sort((a, b) => a - b);
            
            for (let i = 1; i < cadenceWatts.length; i++) {
                const currentWatts = cadenceWatts[i];
                const prevWatts = cadenceWatts[i - 1];
                const currentResistance = cadenceData.get(currentWatts);
                const prevResistance = cadenceData.get(prevWatts);
                
                // Ensure resistance increases with watts (monotonicity)
                if (currentResistance <= prevResistance) {
                    const newResistance = prevResistance + 1;
                    cadenceData.set(currentWatts, Math.min(newResistance, this.maxResistance));
                    totalAdjustments++;
                }
            }
        }

        // Second pass: Resolve cadence line collisions
        const sortedCadences = Array.from(this.data.keys()).sort((a, b) => a - b);
        
        for (const watts of sortedWatts) {
            // Get all cadences that have data at this watt level
            const cadencesAtWatt = [];
            for (const cadence of sortedCadences) {
                const cadenceData = this.data.get(cadence);
                if (cadenceData.has(watts)) {
                    cadencesAtWatt.push({
                        cadence,
                        resistance: cadenceData.get(watts)
                    });
                }
            }
            
            // Sort by cadence (higher cadence should have lower resistance)
            cadencesAtWatt.sort((a, b) => a.cadence - b.cadence);
            
            // Adjust resistances to prevent collisions
            for (let i = 1; i < cadencesAtWatt.length; i++) {
                const current = cadencesAtWatt[i];
                const previous = cadencesAtWatt[i - 1];
                
                // Higher cadence should have lower resistance
                if (current.resistance >= previous.resistance) {
                    const minGap = 1;
                    const newResistance = Math.max(0, previous.resistance - minGap);
                    this.data.get(current.cadence).set(watts, newResistance);
                    totalAdjustments++;
                    
                    // Update the array for subsequent checks
                    current.resistance = newResistance;
                }
            }
        }

        this.updateChart();
        this.updateStatus(`Conflicts resolved: Made ${totalAdjustments} adjustments`);
        this.showSuccess(`Resolved conflicts with ${totalAdjustments} minimal adjustments`);
    }

    smartSmoothTable() {
        if (this.data.size === 0) {
            this.showError('No data to smooth. Please upload a .ptab file first.');
            return;
        }

        if (!confirm('SmartSmooth will fit 4th order bezier curves to your data and evenly space cadence lines. This action can be undone. Continue?')) {
            return;
        }

        // Save current state to history
        this.saveToHistory();

        // Get all unique watt values and sort them
        const allWatts = new Set();
        for (const cadenceData of this.data.values()) {
            for (const watts of cadenceData.keys()) {
                allWatts.add(watts);
            }
        }
        const sortedWatts = Array.from(allWatts).sort((a, b) => a - b);
        
        if (sortedWatts.length < 4) {
            this.showError('Need at least 4 watt levels for bezier curve fitting');
            return;
        }

        const sortedCadences = Array.from(this.data.keys()).sort((a, b) => a - b);
        
        if (sortedCadences.length < 2) {
            this.showError('Need at least 2 cadence lines for smart smoothing');
            return;
        }

        let totalAdjustments = 0;

        // For each watt level, calculate evenly spaced resistance values
        for (const watts of sortedWatts) {
            // Collect all existing resistance values at this watt level
            const resistanceValues = [];
            const cadenceMapping = [];
            
            for (const cadence of sortedCadences) {
                const cadenceData = this.data.get(cadence);
                if (cadenceData.has(watts)) {
                    resistanceValues.push(cadenceData.get(watts));
                    cadenceMapping.push(cadence);
                }
            }
            
            if (resistanceValues.length < 2) continue;
            
            // Sort by resistance to find min and max
            const sortedResistances = [...resistanceValues].sort((a, b) => a - b);
            const minResistance = sortedResistances[0];
            const maxResistance = sortedResistances[sortedResistances.length - 1];
            
            // Calculate even spacing between min and max resistance
            // The spacing gets larger as resistance increases (typical power curve behavior)
            const range = maxResistance - minResistance;
            
            if (range > 0) {
                // Calculate new evenly spaced values with progressive spacing
                const newResistances = [];
                for (let i = 0; i < sortedCadences.length; i++) {
                    const cadence = sortedCadences[i];
                    const cadenceData = this.data.get(cadence);
                    
                    if (cadenceData.has(watts)) {
                        // Use exponential distribution for more realistic power curve spacing
                        const progress = i / (sortedCadences.length - 1);
                        const exponentialProgress = Math.pow(progress, 1.5); // Adjust curve
                        const newResistance = Math.round(maxResistance - (exponentialProgress * range));
                        
                        // Ensure minimum separation between adjacent cadences
                        const minSeparation = Math.max(1, Math.round(range * 0.02)); // 2% of range minimum
                        if (i > 0 && newResistances[i-1] - newResistance < minSeparation) {
                            newResistances.push(newResistances[i-1] - minSeparation);
                        } else {
                            newResistances.push(Math.max(0, newResistance));
                        }
                    }
                }
                
                // Apply the new evenly spaced values
                let index = 0;
                for (const cadence of sortedCadences) {
                    const cadenceData = this.data.get(cadence);
                    if (cadenceData.has(watts)) {
                        const oldValue = cadenceData.get(watts);
                        const newValue = newResistances[index];
                        if (oldValue !== newValue) {
                            cadenceData.set(watts, newValue);
                            totalAdjustments++;
                        }
                        index++;
                    }
                }
            }
        }

        // Now apply bezier smoothing to each cadence line
        for (const [cadence, cadenceData] of this.data) {
            const points = [];
            const cadenceWatts = Array.from(cadenceData.keys()).sort((a, b) => a - b);
            
            if (cadenceWatts.length < 4) continue; // Need at least 4 points for bezier
            
            for (const watts of cadenceWatts) {
                points.push({ x: watts, y: cadenceData.get(watts) });
            }
            
            // Apply bezier smoothing using a simplified 4th order approach
            const smoothedPoints = this.applyBezierSmoothing(points);
            
            // Update the data with smoothed values
            for (const point of smoothedPoints) {
                const originalValue = cadenceData.get(point.x);
                const smoothedValue = Math.round(point.y);
                if (originalValue !== smoothedValue) {
                    cadenceData.set(point.x, Math.max(0, Math.min(this.maxResistance, smoothedValue)));
                    totalAdjustments++;
                }
            }
        }

        // Save the final state to history so redo will work correctly
        this.saveToHistory();
        
        this.updateChart();
        this.updateStatus(`SmartSmooth completed: Made ${totalAdjustments} adjustments`);
        this.showSuccess(`Applied bezier smoothing and even spacing with ${totalAdjustments} adjustments`);
    }

    applyBezierSmoothing(points) {
        if (points.length < 4) return points;
        
        const smoothedPoints = [];
        
        // For each point, calculate a smoothed value using neighboring points
        for (let i = 0; i < points.length; i++) {
            if (i === 0 || i === points.length - 1) {
                // Keep endpoints unchanged
                smoothedPoints.push(points[i]);
                continue;
            }
            
            // Use a weighted average of surrounding points for smoothing
            let weightedSum = 0;
            let totalWeight = 0;
            
            // Define the smoothing window
            const windowSize = Math.min(2, Math.floor(points.length / 3));
            
            for (let j = Math.max(0, i - windowSize); j <= Math.min(points.length - 1, i + windowSize); j++) {
                const distance = Math.abs(j - i);
                const weight = 1 / (1 + distance); // Inverse distance weighting
                
                weightedSum += points[j].y * weight;
                totalWeight += weight;
            }
            
            const smoothedY = weightedSum / totalWeight;
            
            smoothedPoints.push({
                x: points[i].x,
                y: smoothedY
            });
        }
        
        return smoothedPoints;
    }

    // Zoom control methods
    zoomIn() {
        this.chart.zoom(1.2);
        this.updateStatus('Zoomed in');
    }

    zoomOut() {
        this.chart.zoom(0.8);
        this.updateStatus('Zoomed out');
    }

    resetZoom() {
        this.chart.resetZoom();
        this.updateStatus('Zoom reset to default view');
    }

    onDragStart(datasetIndex, index, value) {
        // Save to history before starting drag
        this.saveToHistory();
        // Store the original point for validation
        this.originalDragValue = { ...value };
        
        // Get the cadence for this dataset and make it active
        const dataset = this.chart.data.datasets[datasetIndex];
        const cadence = parseInt(dataset.label.replace(' RPM', ''));
        
        // Only switch if this cadence is different from the current active one
        if (this.activeCadence !== cadence) {
            this.setActiveCadence(cadence);
            this.updateStatus(`Switched to ${cadence} RPM and started dragging point`);
        }
    }

    onDrag(datasetIndex, index, value) {
        // Enforce boundaries
        value.y = Math.max(0, Math.min(this.maxResistance, value.y));
        
        // Get the cadence for this dataset
        const dataset = this.chart.data.datasets[datasetIndex];
        const cadence = parseInt(dataset.label.replace(' RPM', ''));
        
        // Apply collision avoidance and monotonicity
        const safeResistance = this.avoidCollisions(cadence, value.x, value.y);
        if (safeResistance !== value.y) {
            value.y = safeResistance;
        }
    }

    onDragEnd(datasetIndex, index, value) {
        const dataset = this.chart.data.datasets[datasetIndex];
        const cadence = parseInt(dataset.label.replace(' RPM', ''));
        
        // Update the data
        const cadenceData = this.data.get(cadence);
        cadenceData.set(value.x, Math.round(value.y));
        
        this.updateStatus(`Point updated: ${value.x}W -> ${Math.round(value.y)} resistance`);
    }

    downloadTable() {
        if (this.data.size === 0) {
            this.showError('No data to save');
            return;
        }

        // Prompt for filename
        let filename = prompt('Enter filename (without extension):', 'powertable');
        
        // Handle user cancellation
        if (filename === null) {
            this.updateStatus('Save cancelled');
            return;
        }
        
        // Sanitize filename and ensure it's not empty
        filename = filename.trim();
        if (filename === '') {
            filename = 'powertable';
        }
        
        // Remove any existing .ptab extension and add it
        filename = filename.replace(/\.ptab$/i, '') + '.ptab';

        try {
            const content = this.generateTableContent();
            const blob = new Blob([content], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            this.updateStatus(`Table saved as ${filename}`);
        } catch (error) {
            this.showError('Error saving table: ' + error.message);
        }
    }

    generateTableContent() {
        // Generate metadata line
        let content = `# METADATA:HMax=${this.maxResistance}\n`;
        
        // Find all unique power levels
        const allWatts = new Set();
        for (const cadenceData of this.data.values()) {
            for (const watts of cadenceData.keys()) {
                allWatts.add(watts);
            }
        }
        
        const sortedWatts = Array.from(allWatts).sort((a, b) => a - b);
        
        // Generate header
        const header = ['Cadence/Power', ...sortedWatts.map(w => `${w}W`)];
        content += header.join(',') + '\n';
        
        // Generate data rows
        const sortedCadences = Array.from(this.data.keys()).sort((a, b) => a - b);
        
        for (const cadence of sortedCadences) {
            const row = [`${cadence}RPM`];
            const cadenceData = this.data.get(cadence);
            
            for (const watts of sortedWatts) {
                if (cadenceData.has(watts)) {
                    // Divide by multiplier when saving to maintain file format
                    const originalValue = Math.round(cadenceData.get(watts) / this.tableMultiplier);
                    row.push(originalValue.toString());
                } else {
                    row.push('');
                }
            }
            
            content += row.join(',') + '\n';
        }
        
        return content;
    }

    toggleOriginalOverlay() {
        if (this.originalData.size === 0) {
            this.showError('No original data available. Please load a .ptab file first.');
            return;
        }

        this.showingOriginal = !this.showingOriginal;
        const btn = document.getElementById('toggle-original-btn');
        const opacityControl = document.getElementById('opacity-control');
        
        if (this.showingOriginal) {
            btn.classList.add('active');
            btn.innerHTML = '<span>👻</span> Hide Original';
            opacityControl.style.display = 'flex';
            this.updateStatus('Showing original data overlay');
        } else {
            btn.classList.remove('active');
            btn.innerHTML = '<span>👻</span> Show Original';
            opacityControl.style.display = 'none';
            this.updateStatus('Original data overlay hidden');
        }
        
        this.updateChart();
    }

    updateOriginalOpacity(opacityPercent) {
        this.originalOpacity = opacityPercent;
        document.getElementById('opacity-value').textContent = `${opacityPercent}%`;
        
        if (this.showingOriginal) {
            this.updateChart();
            this.updateStatus(`Original overlay opacity: ${opacityPercent}%`);
        }
    }

    updateStatus(message) {
        document.getElementById('status-message').textContent = message;
    }

    showError(message) {
        const existingError = document.querySelector('.error-message');
        if (existingError) {
            existingError.remove();
        }

        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        
        const toolbar = document.querySelector('.toolbar');
        toolbar.parentNode.insertBefore(errorDiv, toolbar.nextSibling);
        
        setTimeout(() => {
            errorDiv.remove();
        }, 5000);
    }

    showSuccess(message) {
        const existingSuccess = document.querySelector('.success-message');
        if (existingSuccess) {
            existingSuccess.remove();
        }

        const successDiv = document.createElement('div');
        successDiv.className = 'success-message';
        successDiv.textContent = message;
        
        const toolbar = document.querySelector('.toolbar');
        toolbar.parentNode.insertBefore(successDiv, toolbar.nextSibling);
        
        setTimeout(() => {
            successDiv.remove();
        }, 3000);
    }
}

// Initialize the application when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new PowerTableBuilder();
});
