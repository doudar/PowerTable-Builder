# SmartSpin2k PowerTable Builder

An interactive web application for editing SmartSpin2k power table (.ptab) files. This tool provides a graphical interface to visualize, edit, and complete power curve data for different cadence levels.

## Features

- **Interactive Chart Visualization**: Real-time power curve display with Chart.js
- **Drag-and-Drop Editing**: Directly manipulate data points on the chart
- **Monotonicity Enforcement**: Automatic validation to ensure power curves increase properly
- **Multi-Cadence Support**: Edit multiple cadence lines with color-coded visualization
- **File Management**: Upload and download .ptab files with metadata preservation
- **Responsive Design**: Works on desktop and mobile devices
- **Real-time Validation**: Prevents invalid edits that would break curve monotonicity

## Getting Started

### Prerequisites

- Modern web browser with JavaScript enabled
- No server setup required - runs entirely in the browser

### Installation

1. Clone or download this repository
2. Open `index.html` in your web browser
3. Start editing power tables!

### Usage

1. **Upload a .ptab file**: Click "Upload .ptab File" and select your SmartSpin2k power table
2. **Select a cadence**: Click on any cadence button (e.g., "60 RPM") to make it active
3. **Edit data points**:
   - Click and drag existing points to adjust values
   - Click on empty chart areas to add new points
   - Click on points to edit values manually
4. **Download**: Save your edited table as a new .ptab file

## File Format

The application supports SmartSpin2k .ptab files, which are CSV files with:
- Metadata header containing maximum resistance value
- Power levels as column headers (in Watts)
- Cadence levels as row headers (in RPM)
- Resistance values as data points

Example format:
```
# METADATA:HMax=32029
Cadence/Power,0W,30W,60W,90W,120W...
60RPM,,165,749,950,1222...
65RPM,,165,536,877,1097...
```

## Technical Details

### Architecture

- **Frontend**: Pure HTML5, CSS3, JavaScript (ES6+)
- **Charting**: Chart.js with dragData plugin
- **Styling**: CSS Grid and Flexbox for responsive layouts
- **Data Handling**: In-memory Map structures for efficient data management

### Key Components

1. **PowerTableBuilder Class**: Main application controller
2. **Chart Management**: Interactive visualization with drag support
3. **File I/O**: .ptab format parsing and generation
4. **Validation Engine**: Monotonicity and constraint checking
5. **UI Controls**: Cadence selection and point editing interface

### Browser Compatibility

- Chrome 70+
- Firefox 65+
- Safari 12+
- Edge 79+

## Development

### Project Structure

```
├── index.html          # Main application page
├── styles.css          # All styling and responsive design
├── script.js           # Core application logic
├── README.md           # This file
└── .github/
    └── copilot-instructions.md  # Development guidelines
```

### Key Features Implementation

- **Monotonicity Enforcement**: Validates that resistance values increase with watts
- **Interactive Editing**: Chart.js with custom drag handlers
- **Multi-cadence Management**: Color-coded line system with activation states
- **File Format Compatibility**: Preserves SmartSpin2k metadata and structure

## Contributing

When contributing to this project:

1. Maintain the monotonicity requirement for all power curves
2. Ensure .ptab file format compatibility
3. Test responsiveness across different screen sizes
4. Validate error handling for edge cases
5. Follow the existing code style and structure

## License

This project is open source and available under standard licensing terms.

## Support

For issues related to SmartSpin2k hardware or firmware, please refer to the official SmartSpin2k documentation and community resources.
