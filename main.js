document.addEventListener('DOMContentLoaded', () => {
    // --- Common Elements ---
    const themeToggle = document.getElementById("theme-toggle");
    const sunIcon = document.getElementById("sun-icon");
    const moonIcon = document.getElementById("moon-icon");

    // --- Tab Elements ---
    const tabs = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');

    // --- Tab 1: Manifest Converter Elements ---
    const jsonFileInput1 = document.getElementById("jsonFile");
    const convertBtn = document.getElementById("convertBtn");
    const fileNameSpan1 = document.getElementById("fileName");
    const fileDropArea1 = document.getElementById("file-drop-area");

    // --- Tab 2: Metrics Compiler Elements ---
    const jsonFileInput2 = document.getElementById("jsonFiles");
    const fileNameSpan2 = document.getElementById("fileNames");
    const fileDropArea2 = document.getElementById("file-drop-area-2");
    const resultsArea = document.getElementById("results-area");
    const resultsTableBody = document.querySelector("#results-table tbody");
    const downloadCsvBtn = document.getElementById("downloadCsvBtn");

    let processedMetrics = [];

    // --- Global Initializer ---
    function initialize() {
        setupTheme();
        setupTabs();
        setupManifestConverter();
        setupMetricsCompiler();
    }

    // --- Theme Setup ---
    function setupTheme() {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme !== 'light') {
            document.body.classList.add('dark-mode');
            sunIcon.style.display = 'none';
            moonIcon.style.display = 'inline-block';
        }

        themeToggle.addEventListener('click', () => {
            document.body.classList.toggle('dark-mode');
            const isDarkMode = document.body.classList.contains('dark-mode');
            localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
            sunIcon.style.display = isDarkMode ? 'none' : 'inline-block';
            moonIcon.style.display = isDarkMode ? 'inline-block' : 'none';
        });
    }

    // --- Tab Switching Logic ---
    function setupTabs() {
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                tabs.forEach(t => t.classList.remove('active'));
                tabContents.forEach(c => c.classList.remove('active'));

                tab.classList.add('active');
                document.getElementById(tab.dataset.tab).classList.add('active');
            });
        });
    }

    // --- Tab 1: Manifest Converter Logic ---
    function setupManifestConverter() {
        jsonFileInput1.addEventListener('change', () => handleManifestFile(jsonFileInput1.files));
        fileDropArea1.addEventListener('dragover', e => { e.preventDefault(); fileDropArea1.classList.add('dragover'); });
        fileDropArea1.addEventListener('dragleave', () => fileDropArea1.classList.remove('dragover'));
        fileDropArea1.addEventListener('drop', e => { e.preventDefault(); fileDropArea1.classList.remove('dragover'); handleManifestFile(e.dataTransfer.files); });
        fileDropArea1.addEventListener('click', () => jsonFileInput1.click());
        convertBtn.addEventListener("click", convertManifestToCsv);
    }

    function handleManifestFile(files) {
        if (files.length > 0) {
            const file = files[0];
            if (true) { // Accept all file types
                jsonFileInput1.files = files;
                fileNameSpan1.textContent = file.name;
                fileNameSpan1.style.color = 'var(--text-primary)';
                convertBtn.disabled = false;
            } else {
                
                fileNameSpan1.style.color = 'red';
                convertBtn.disabled = true;
            }
        } else {
            fileNameSpan1.textContent = "";
            convertBtn.disabled = true;
        }
    }

    function convertManifestToCsv() {
        if (jsonFileInput1.files.length === 0) {
            alert("Please select a JSON file.");
            return;
        }
        const file = jsonFileInput1.files[0];
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target.result);
                const sequenceEntries = data.sequence_entries || {};
                const last_updated_time = new Date(data.last_updated_time);
                const sortedEntries = Object.values(sequenceEntries).sort((a, b) => a.config_idx - b.config_idx);

                if (sortedEntries.length === 0) {
                    alert("The JSON file does not contain any 'sequence_entries'.");
                    return;
                }

                const startTimes = sortedEntries.map(e => new Date(e.start_time));
                const trainTimes = startTimes.map((start, i) => (i === startTimes.length - 1 ? last_updated_time - start : startTimes[i + 1] - start) / 1000);

                const rows = sortedEntries.map((seqData, i) => {
                    const metrics = seqData.training_report?.metrics || {};
                    return {
                        "config_idx": seqData.config_idx,
                        "accuracy": (( (metrics["test/neurocle_accuracy"] || metrics["valid/neurocle_accuracy"]) || 0) * 100).toFixed(2),
                        "precision": (( (metrics["test/neurocle_precision"] || metrics["valid/neurocle_precision"]) || 0) * 100).toFixed(2),
                        "recall": (( (metrics["test/neurocle_recall"] || metrics["valid/neurocle_recall"]) || 0) * 100).toFixed(2),
                        "f1_score": (( (metrics["test/neurocle_f1"] || metrics["valid/neurocle_f1"]) || 0) * 100).toFixed(2),
                        "train_Time": `${Math.round(trainTimes[i] / 60)}m`
                    };
                });
                
                downloadCSV(rows, "config_metrics.csv");
            } catch (error) {
                alert("Error processing file: " + error.message);
            }
        };
        reader.readAsText(file);
    }
    
    // --- Tab 2: Metrics Compiler Logic ---
    function setupMetricsCompiler() {
        jsonFileInput2.addEventListener('change', () => handleMetricsFiles(jsonFileInput2.files));
        fileDropArea2.addEventListener('dragover', e => { e.preventDefault(); fileDropArea2.classList.add('dragover'); });
        fileDropArea2.addEventListener('dragleave', () => fileDropArea2.classList.remove('dragover'));
        fileDropArea2.addEventListener('drop', e => { e.preventDefault(); fileDropArea2.classList.remove('dragover'); handleMetricsFiles(e.dataTransfer.files); });
        fileDropArea2.addEventListener('click', () => jsonFileInput2.click());
        downloadCsvBtn.addEventListener("click", () => downloadCSV(processedMetrics, "combined_metrics.csv"));
    }

    function handleMetricsFiles(files) {
        const fileList = Array.from(files);
        const validFiles = fileList.filter(file => /metrics(?:_\d+)?\.json$/.test(file.name));

        if (validFiles.length === 0) {
            fileNameSpan2.textContent = "No valid 'metrics(_*).json' files selected.";
            fileNameSpan2.style.color = 'red';
            return;
        }

        fileNameSpan2.textContent = `${validFiles.length} file(s) selected.`;
        fileNameSpan2.style.color = 'var(--text-primary)';

        const promises = validFiles.map(file => {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (event) => {
                    try {
                        const data = JSON.parse(event.target.result);
                        resolve({ file, data });
                    } catch (e) {
                        console.warn(`[WARN] Could not parse file: ${file.name} (${e})`);
                        resolve(null); // Resolve with null if parsing fails
                    }
                };
                reader.onerror = (e) => {
                    console.warn(`[WARN] Could not read file: ${file.name} (${e})`);
                    resolve(null); // Resolve with null if reading fails
                };
                reader.readAsText(file);
            });
        });

        Promise.all(promises).then(results => {
            const validResults = results.filter(r => r !== null);
            
            processedMetrics = validResults.map(({ file, data }) => {
                return {
                    "metrics_index": extractIndex(file.name),
                    "accuracy": parseFloat(((data["test/neurocle_accuracy"] || 0) * 100).toFixed(2)),
                    "precision": parseFloat(((data["test/neurocle_precision"] || 0) * 100).toFixed(2)),
                    "recall": parseFloat(((data["test/neurocle_recall"] || 0) * 100).toFixed(2)),
                    "f1": parseFloat(((data["test/neurocle_f1"] || 0) * 100).toFixed(2)),
                };
            });

            processedMetrics.sort((a, b) => a.metrics_index - b.metrics_index);

            displayMetricsTable(processedMetrics);
            resultsArea.style.display = 'block';
        });
    }
    
    function extractIndex(filename) {
        const match = filename.match(/metrics(?:_(\d+))?\.json$/);
        if (!match) return Infinity; // Should not happen due to filter
        return match[1] ? parseInt(match[1], 10) : 0;
    }

    function displayMetricsTable(data) {
        resultsTableBody.innerHTML = ''; // Clear existing rows
        if (data.length === 0) {
            resultsArea.style.display = 'none';
            return;
        }

        data.forEach(row => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${row.metrics_index}</td>
                <td>${row.accuracy}</td>
                <td>${row.precision}</td>
                <td>${row.recall}</td>
                <td>${row.f1}</td>
            `;
            resultsTableBody.appendChild(tr);
        });
    }

    // --- Generic CSV Download Utility ---
    function downloadCSV(data, filename) {
        if (!data || data.length === 0) {
            alert("No data available to download.");
            return;
        }
        const headers = Object.keys(data[0]);
        const csvHeader = headers.join(",") + "\n";
        const csvRows = data.map(row => headers.map(header => row[header]).join(",")).join("\n");
        const csvContent = csvHeader + csvRows;

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8-sig;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    // --- Run Initializer ---
    initialize();
});
