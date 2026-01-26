document.addEventListener('DOMContentLoaded', () => {
    const jsonFileInput = document.getElementById("jsonFile");
    const convertBtn = document.getElementById("convertBtn");
    const fileNameSpan = document.getElementById("fileName");
    const fileDropArea = document.getElementById("file-drop-area");
    const themeToggle = document.getElementById("theme-toggle");
    const sunIcon = document.getElementById("sun-icon");
    const moonIcon = document.getElementById("moon-icon");

    // Theme toggle
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (prefersDark || localStorage.getItem('theme') === 'dark') {
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


    // Handle file selection via browse button
    jsonFileInput.addEventListener('change', () => {
        handleFile(jsonFileInput.files);
    });

    // Handle file drop
    fileDropArea.addEventListener('dragover', (event) => {
        event.preventDefault();
        fileDropArea.classList.add('dragover');
    });

    fileDropArea.addEventListener('dragleave', () => {
        fileDropArea.classList.remove('dragover');
    });

    fileDropArea.addEventListener('drop', (event) => {
        event.preventDefault();
        fileDropArea.classList.remove('dragover');
        handleFile(event.dataTransfer.files);
    });
    
    fileDropArea.addEventListener('click', () => {
        jsonFileInput.click();
    });


    function handleFile(files) {
        if (files.length > 0) {
            const file = files[0];
            if (file.type === "application/json") {
                jsonFileInput.files = files;
                fileNameSpan.textContent = file.name;
                fileNameSpan.style.color = 'var(--text-primary)';
                convertBtn.disabled = false;
            } else {
                fileNameSpan.textContent = "Error: Please select a .json file.";
                fileNameSpan.style.color = 'red';
                convertBtn.disabled = true;
            }
        } else {
            fileNameSpan.textContent = "";
            convertBtn.disabled = true;
        }
    }

    // Handle the conversion logic
    convertBtn.addEventListener("click", () => {
        if (jsonFileInput.files.length === 0) {
            alert("Please select a JSON file.");
            return;
        }

        const file = jsonFileInput.files[0];
        const reader = new FileReader();

        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target.result);
                const sequenceEntries = data.sequence_entries || {};
                const last_updated_time = new Date(data.last_updated_time);

                const sortedEntries = Object.values(sequenceEntries).sort((a, b) => a.config_idx - b.config_idx);

                if(sortedEntries.length === 0) {
                    alert("The JSON file does not contain any 'sequence_entries'.");
                    return;
                }

                const startTimes = sortedEntries.map(e => new Date(e.start_time));

                const trainTimes = startTimes.map((start, i) => {
                    const end = (i === startTimes.length - 1) ? last_updated_time : startTimes[i + 1];
                    return (end - start) / 1000; // a to seconds
                });
                
                const rows = sortedEntries.map((seqData, i) => {
                    const metrics = seqData.training_report?.metrics || {};
                    const accuracy = metrics["test/neurocle_accuracy"] || 0;
                    const precision = metrics["test/neurocle_precision"] || 0;
                    const recall = metrics["test/neurocle_recall"] || 0;
                    const f1_score = metrics["test/neurocle_f1"] || 0;

                    return {
                        "config_idx": seqData.config_idx,
                        "accuracy": (accuracy * 100).toFixed(2),
                        "precision": (precision * 100).toFixed(2),
                        "recall": (recall * 100).toFixed(2),
                        "f1_score": (f1_score * 100).toFixed(2),
                        "train_Time": `${Math.round(trainTimes[i] / 60)}m`
                    };
                });

                // Create CSV
                const headers = Object.keys(rows[0]);
                const csvHeader = headers.join(",") + "\n";
                const csvRows = rows.map(row => headers.map(header => row[header]).join(",")).join("\n");
                const csvContent = "data:text/csv;charset=utf-8-sig," + encodeURIComponent(csvHeader + csvRows);
                
                // Trigger download
                const link = document.createElement("a");
                link.setAttribute("href", csvContent);
                link.setAttribute("download", "config_metrics.csv");
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);

            } catch (error) {
                alert("Error processing file: " + error.message);
            }
        };

        reader.readAsText(file);
    });
});