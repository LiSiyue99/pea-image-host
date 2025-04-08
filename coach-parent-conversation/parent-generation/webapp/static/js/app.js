// JavaScript code will be added here later

// 在页面加载后执行
document.addEventListener('DOMContentLoaded', () => {
    console.log('页面加载完成, 初始化应用...');
    
    // 获取并显示文件列表
    fetchAndDisplayFiles();
    
    // 获取并显示配置
    fetchAndDisplayConfig();
    
    // 绑定生成按钮事件
    const generateButton = document.getElementById('generate-button');
    if (generateButton) {
        console.log('找到生成按钮，绑定事件');
        generateButton.addEventListener('click', handleGenerateClick);
        
        // 按钮样式已在HTML中设置，无需再重复设置
        
        // 设置按钮区域样式已在HTML中完成，无需再修改
    } else {
        console.error('未找到生成按钮元素!');
    }
    
    // 绑定刷新按钮事件
    const refreshButton = document.getElementById('refresh-files-button');
    if (refreshButton) {
        refreshButton.addEventListener('click', () => {
            console.log("刷新文件列表");
            fetchAndDisplayFiles();
        });
    }
});

// Function to fetch and display the file list
async function fetchAndDisplayFiles() {
    const fileListElement = document.getElementById('file-list');
    const loadingElement = document.getElementById('file-list-loading');

    if (!fileListElement) {
        console.error("File list element not found in the DOM.");
        return;
    }
    
    // 显示加载提示
    fileListElement.innerHTML = '<li id="file-list-loading">正在刷新文件列表...</li>';

    try {
        // 添加随机查询参数以避免缓存
        const timestamp = new Date().getTime();
        const response = await fetch(`/api/files?t=${timestamp}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const files = await response.json();
        console.log("获取到的文件列表:", files);

        // 清空文件列表
        fileListElement.innerHTML = '';

        if (files.length === 0) {
            fileListElement.innerHTML = '<li>尚未生成任何文件。</li>';
        } else {
            // 按日期分组文件
            const filesByDate = {};
            
            files.forEach(filename => {
                // 提取日期信息：假设格式为name_YYMMDDHHMM.csv
                const dateMatch = filename.match(/_(\d{6})\d{4}\.csv$/);
                
                if (dateMatch && dateMatch[1]) {
                    const dateStr = dateMatch[1];
                    // 格式化日期为 YY-MM-DD
                    const formattedDate = `20${dateStr.substring(0, 2)}-${dateStr.substring(2, 4)}-${dateStr.substring(4, 6)}`;
                    
                    if (!filesByDate[formattedDate]) {
                        filesByDate[formattedDate] = [];
                    }
                    filesByDate[formattedDate].push(filename);
                } else {
                    // 对于不符合格式的文件，放入"其他"分组
                    if (!filesByDate['其他']) {
                        filesByDate['其他'] = [];
                    }
                    filesByDate['其他'].push(filename);
                }
            });
            
            // 按日期排序（从新到旧）
            const sortedDates = Object.keys(filesByDate).sort((a, b) => {
                if (a === '其他') return 1;
                if (b === '其他') return -1;
                return b.localeCompare(a);
            });
            
            // 创建分组展示
            sortedDates.forEach(date => {
                const dateGroup = document.createElement('div');
                dateGroup.classList.add('mb-4');
                
                // 创建日期标题
                const dateHeader = document.createElement('h3');
                dateHeader.textContent = date;
                dateHeader.classList.add('text-md', 'font-medium', 'text-gray-700', 'mb-2', 'border-b', 'pb-1');
                dateGroup.appendChild(dateHeader);
                
                // 创建文件列表
                const dateFileList = document.createElement('ul');
                dateFileList.classList.add('pl-4');
                
                filesByDate[date].forEach(filename => {
                    const listItem = document.createElement('li');
                    listItem.classList.add('mb-1');
                    
                    const link = document.createElement('a');
                    // Encode filename component for URL safety
                    const encodedFilename = encodeURIComponent(filename);
                    link.href = `/api/files/download/${encodedFilename}`;
                    link.textContent = filename;
                    link.classList.add('text-blue-600', 'hover:text-blue-800', 'hover:underline');
                    // 强制浏览器下载文件而非打开
                    link.setAttribute('download', filename);
                    
                    listItem.appendChild(link);
                    dateFileList.appendChild(listItem);
                });
                
                dateGroup.appendChild(dateFileList);
                fileListElement.appendChild(dateGroup);
            });
        }
    } catch (error) {
        console.error('Error fetching file list:', error);
        fileListElement.innerHTML = `<li class="text-red-500">加载文件列表失败: ${error.message}</li>`;
    }
}

// --- Config Area Functionality ---
const configFormArea = document.getElementById('config-form-area');

// Helper to create input elements
function createInputElement(id, name, label, type, value, placeholder = '') {
    const div = document.createElement('div');
    div.classList.add('mb-4');

    const labelElement = document.createElement('label');
    labelElement.htmlFor = id;
    labelElement.textContent = label;
    labelElement.classList.add('block', 'text-sm', 'font-medium', 'text-gray-700');
    div.appendChild(labelElement);

    const inputElement = document.createElement('input');
    inputElement.type = type;
    inputElement.id = id;
    inputElement.name = name;
    inputElement.value = value ?? ''; // Use empty string if value is null/undefined
    inputElement.placeholder = placeholder;
    inputElement.classList.add('mt-1', 'block', 'w-full', 'rounded-md', 'border-gray-300', 'shadow-sm', 'focus:border-indigo-500', 'focus:ring-indigo-500', 'sm:text-sm');
    if (type === 'number') {
        inputElement.min = '1'; // Example: minimum 1 profile
    }
    div.appendChild(inputElement);
    return div;
}

// 全局变量存储配置选项
let configOptions = null;

// 添加全局变量存储翻译
let columnTranslations = {};

async function fetchAndDisplayConfig() {
    if (!configFormArea) {
        console.error("Config form area element not found.");
        return;
    }
    configFormArea.innerHTML = '<p class="text-gray-500">加载配置中...</p>';

    try {
        // 获取当前配置
        const configResponse = await fetch('/api/config');
        if (!configResponse.ok) {
            let errorDetail = "加载配置失败。";
            try {
                const errorData = await configResponse.json();
                errorDetail = errorData.detail || JSON.stringify(errorData);
            } catch (e) {
                errorDetail = `服务器错误，状态码: ${configResponse.status}`;
            }
            throw new Error(errorDetail);
        }
        const configData = await configResponse.json();
        
        // 同时获取配置选项
        const optionsResponse = await fetch('/api/config/options');
        if (!optionsResponse.ok) {
            console.error("获取配置选项失败，将使用有限功能");
        } else {
            configOptions = await optionsResponse.json();
            // 保存翻译数据
            columnTranslations = configOptions.translations || {};
            console.log("配置选项已加载:", configOptions);
        }

        // ---- Build the Form ----
        configFormArea.innerHTML = ''; // Clear loading message
        const form = document.createElement('form');
        form.id = 'config-form';
        form.addEventListener('submit', handleConfigSave); // Add submit handler

        // 创建基本配置部分（高亮显示）
        const basicConfigArea = document.createElement('div');
        basicConfigArea.classList.add('p-6', 'bg-green-50', 'rounded-lg', 'border', 'border-green-200', 'mb-8', 'shadow-sm');
        
        // 添加基本配置标题
        const basicConfigTitle = document.createElement('h3');
        basicConfigTitle.textContent = '基本配置';
        basicConfigTitle.classList.add('text-lg', 'font-medium', 'text-green-800', 'mb-4');
        basicConfigArea.appendChild(basicConfigTitle);
        
        // 添加常用输入字段（生成数量和文件名前缀）
        const numProfilesInput = createInputElement('num_profiles', 'num_profiles', '生成数量:', 'number', configData.num_profiles || 1);
        numProfilesInput.classList.add('mb-6');
        numProfilesInput.querySelector('input').classList.add('text-lg', 'font-medium', 'h-12', 'bg-white', 'border-green-300');
        numProfilesInput.querySelector('label').classList.add('text-base', 'text-green-700');
        basicConfigArea.appendChild(numProfilesInput);
        
        const filenamePrefixInput = createInputElement('filename_prefix', 'filename_prefix', '文件名前缀 (可选):', 'text', configData.filename_prefix, 'e.g., experiment1');
        filenamePrefixInput.classList.add('mb-2');
        filenamePrefixInput.querySelector('input').classList.add('text-lg', 'font-medium', 'h-12', 'bg-white', 'border-green-300');
        filenamePrefixInput.querySelector('label').classList.add('text-base', 'text-green-700');
        basicConfigArea.appendChild(filenamePrefixInput);
        
        // 添加提示说明
        const prefixHelpText = document.createElement('p');
        prefixHelpText.innerHTML = '提示: 文件名格式将为 <span class="font-medium">前缀_特征-值_日期时间.csv</span>，例如: experiment1_gender-female_2504041134.csv';
        prefixHelpText.classList.add('text-sm', 'text-gray-500', 'mb-4', 'ml-2');
        basicConfigArea.appendChild(prefixHelpText);
        
        // 将基本配置添加到表单
        form.appendChild(basicConfigArea);
        
        // 创建高级配置折叠区域
        const advancedConfigContainer = document.createElement('details');
        advancedConfigContainer.classList.add('mb-6');
        
        const advancedSummary = document.createElement('summary');
        advancedSummary.textContent = '路径配置（高级）';
        advancedSummary.classList.add('text-md', 'font-medium', 'text-gray-700', 'cursor-pointer', 'mb-2');
        advancedConfigContainer.appendChild(advancedSummary);
        
        // 添加不常用输入字段到折叠区域
        const advancedConfigContent = document.createElement('div');
        advancedConfigContent.classList.add('pl-4', 'pt-2', 'border-l-2', 'border-gray-200');
        
        advancedConfigContent.appendChild(createInputElement('output_dir', 'output_dir', '输出目录:', 'text', configData.output_dir || '../output'));
        advancedConfigContent.appendChild(createInputElement('profile_sources_dir', 'profile_sources_dir', '源文件目录:', 'text', configData.profile_sources_dir || '../parent-profile'));
        
        // 添加说明文字
        const advancedHelpText = document.createElement('p');
        advancedHelpText.textContent = '注意: 除非必要，请勿修改以上路径配置';
        advancedHelpText.classList.add('text-sm', 'text-gray-500', 'mt-2', 'italic');
        advancedConfigContent.appendChild(advancedHelpText);
        
        advancedConfigContainer.appendChild(advancedConfigContent);
        form.appendChild(advancedConfigContainer);

        // Placeholders for complex sections
        const advancedTitle = document.createElement('h3');
        advancedTitle.textContent = '高级配置';
        advancedTitle.classList.add('text-lg', 'font-medium', 'text-gray-900', 'mt-6', 'mb-4', 'border-t', 'pt-4');
        form.appendChild(advancedTitle);

        const fixedValuesArea = document.createElement('div');
        fixedValuesArea.id = 'fixed-values-area';
        fixedValuesArea.classList.add('p-4', 'rounded-lg', 'bg-blue-50', 'mb-6', 'border', 'border-blue-200');
        fixedValuesArea.innerHTML = '<h4 class="font-medium text-blue-800 mb-1">固定值 (Fixed Values)</h4><p class="text-sm text-gray-500 mb-3">为特定列指定固定值 (优先级最高)。</p><div id="fixed-values-inputs"><!-- Inputs added here later --></div>';
        form.appendChild(fixedValuesArea);

        const distributionsArea = document.createElement('div');
        distributionsArea.id = 'distributions-area';
        distributionsArea.classList.add('p-4', 'rounded-lg', 'bg-green-50', 'mb-6', 'border', 'border-green-200');
        distributionsArea.innerHTML = '<h4 class="font-medium text-green-800 mb-1">完整分布 (Distributions)</h4><p class="text-sm text-gray-500 mb-3">为特定列的所有选项指定精确比例 (和必须为1)。</p><div id="distributions-inputs"><!-- Inputs added here later --></div>';
        form.appendChild(distributionsArea);

        const targetPercentagesArea = document.createElement('div');
        targetPercentagesArea.id = 'target-percentages-area';
        targetPercentagesArea.classList.add('p-4', 'rounded-lg', 'bg-purple-50', 'mb-6', 'border', 'border-purple-200');
        targetPercentagesArea.innerHTML = '<h4 class="font-medium text-purple-800 mb-1">目标百分比 (Target Percentages)</h4><p class="text-sm text-gray-500 mb-3">为特定列的部分选项指定目标比例 (剩余随机)。</p><div id="target-percentages-inputs"><!-- Inputs added here later --></div>';
        form.appendChild(targetPercentagesArea);

        // Save Button
        const saveButtonDiv = document.createElement('div');
        saveButtonDiv.classList.add('mt-6', 'border-t', 'pt-4');
        const saveButton = document.createElement('button');
        saveButton.type = 'submit';
        saveButton.id = 'save-config-button';
        saveButton.textContent = '保存配置';
        saveButton.classList.add('bg-green-600', 'hover:bg-green-700', 'text-white', 'font-bold', 'py-3', 'px-6', 'rounded-md', 'transition', 'duration-150', 'ease-in-out', 'disabled:opacity-50', 'text-lg');
        // saveButton.disabled = true; // Enable save button by default now
        saveButtonDiv.appendChild(saveButton);

        const saveStatus = document.createElement('p');
        saveStatus.id = 'save-status';
        saveStatus.classList.add('mt-2', 'text-sm', 'text-gray-600');
        saveButtonDiv.appendChild(saveStatus);

        form.appendChild(saveButtonDiv);

        configFormArea.appendChild(form);

        // --- TODO: Call functions to populate complex sections based on configData ---
        populateFixedValues(configData.fixed_values || {});
        populateDistributions(configData.distributions || {});
        populateTargetPercentages(configData.target_percentages || {});
        // --- End TODO ---

    } catch (error) {
        console.error('Error fetching/displaying config:', error);
        configFormArea.innerHTML = `<p class="text-red-500">加载或显示配置出错: ${error.message}</p>`;
    }
}

// --- Placeholder functions for populating complex areas (to be implemented later) ---
function populateFixedValues(fixedData) {
    const container = document.getElementById('fixed-values-inputs');
    if (!container) return;
    
    // 清空容器
    container.innerHTML = '';
    
    // 如果没有配置选项，则无法构建表单
    if (!configOptions || !configOptions.columns || !configOptions.options) {
        container.innerHTML = `<p class="text-yellow-500">未能加载配置选项，无法构建表单</p>`;
        return;
    }
    
    // 添加"添加一个固定值"按钮
    const addButton = document.createElement('button');
    addButton.type = 'button';
    addButton.textContent = '+ 添加固定值';
    addButton.classList.add('mb-4', 'bg-blue-500', 'hover:bg-blue-600', 'text-white', 'py-1', 'px-3', 'rounded-md', 'text-sm');
    addButton.addEventListener('click', () => addFixedValueRow(container));
    container.appendChild(addButton);
    
    // 创建现有值的行
    if (Object.keys(fixedData).length > 0) {
        for (const [column, value] of Object.entries(fixedData)) {
            addFixedValueRow(container, column, value);
        }
    } else {
        // 如果没有现有值，添加一个空行
        addFixedValueRow(container);
    }
}

// 修改显示列名的函数，添加双语支持
function getColumnDisplayName(column) {
    const translation = columnTranslations[column];
    return translation ? `${column} (${translation})` : column;
}

// 更新固定值行的创建函数
function addFixedValueRow(container, selectedColumn = '', selectedValue = '') {
    const rowId = `fixed-row-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const row = document.createElement('div');
    row.id = rowId;
    row.classList.add('flex', 'flex-wrap', 'gap-2', 'mb-2', 'items-center', 'p-2', 'rounded', 'bg-white', 'border', 'border-blue-200');
    
    // 第一个下拉框 - 选择列
    const columnSelect = document.createElement('select');
    columnSelect.classList.add('rounded-md', 'border-gray-300', 'shadow-sm', 'focus:border-blue-500', 'focus:ring-blue-500', 'sm:text-sm');
    columnSelect.name = `fixed_column_${rowId}`;
    
    // 添加一个空选项
    const emptyOption = document.createElement('option');
    emptyOption.value = '';
    emptyOption.textContent = '-- 选择列 --';
    columnSelect.appendChild(emptyOption);
    
    // 添加所有可用列（使用双语显示）
    configOptions.columns.forEach(column => {
        const option = document.createElement('option');
        option.value = column;
        option.textContent = getColumnDisplayName(column);
        option.selected = column === selectedColumn;
        columnSelect.appendChild(option);
    });
    
    // 第二个下拉框 - 选择值（会根据选择的列动态变化）
    const valueSelect = document.createElement('select');
    valueSelect.classList.add('rounded-md', 'border-gray-300', 'shadow-sm', 'focus:border-blue-500', 'focus:ring-blue-500', 'sm:text-sm');
    valueSelect.name = `fixed_value_${rowId}`;
    
    // 列选择变化时更新值下拉框
    columnSelect.addEventListener('change', () => {
        updateValueOptions(columnSelect.value, valueSelect);
    });
    
    // 删除按钮
    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.textContent = '删除';
    deleteButton.classList.add('text-red-500', 'text-sm');
    deleteButton.addEventListener('click', () => {
        row.remove();
    });
    
    // 添加元素到行
    row.appendChild(columnSelect);
    row.appendChild(valueSelect);
    row.appendChild(deleteButton);
    
    // 添加行到容器
    container.appendChild(row);
    
    // 初始化值下拉框
    if (selectedColumn) {
        updateValueOptions(selectedColumn, valueSelect, selectedValue);
    } else {
        // 初始为禁用状态
        valueSelect.disabled = true;
        valueSelect.innerHTML = '<option value="">-- 请先选择列 --</option>';
    }
}

// 修改固定值添加函数中的complain处理部分
function updateValueOptions(columnName, selectElement, selectedValue = '') {
    // 清空现有选项
    selectElement.innerHTML = '';
    
    if (!columnName) {
        selectElement.disabled = true;
        selectElement.innerHTML = '<option value="">-- 请先选择列 --</option>';
        return;
    }
    
    selectElement.disabled = false;
    
    // 获取该列的所有可能值
    const options = configOptions.options[columnName] || [];
    
    // 添加空选项
    const emptyOption = document.createElement('option');
    emptyOption.value = '';
    emptyOption.textContent = '-- 选择值 --';
    selectElement.appendChild(emptyOption);
    
    // 添加所有值选项
    options.forEach(option => {
        const optionElement = document.createElement('option');
        optionElement.value = option;
        optionElement.textContent = option;
        optionElement.selected = option === selectedValue;
        selectElement.appendChild(optionElement);
    });
}

function populateDistributions(distData) {
    const container = document.getElementById('distributions-inputs');
    if (!container) return;
    
    // 清空容器
    container.innerHTML = '';
    
    // 如果没有配置选项，则无法构建表单
    if (!configOptions || !configOptions.columns || !configOptions.options) {
        container.innerHTML = `<p class="text-yellow-500">未能加载配置选项，无法构建表单</p>`;
        return;
    }
    
    // 添加选择列的下拉框
    const columnSelect = document.createElement('select');
    columnSelect.classList.add('mb-4', 'rounded-md', 'border-gray-300', 'shadow-sm', 'focus:border-indigo-500', 'focus:ring-indigo-500', 'sm:text-sm');
    columnSelect.id = 'dist-column-select';
    
    // 添加一个默认选项
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = '-- 选择要配置的列 --';
    columnSelect.appendChild(defaultOption);
    
    // 添加所有可用列
    configOptions.columns.forEach(column => {
        const option = document.createElement('option');
        option.value = column;
        option.textContent = getColumnDisplayName(column);
        columnSelect.appendChild(option);
    });
    
    // 列选择变化时创建相应的分布表单
    columnSelect.addEventListener('change', function() {
        const selectedColumn = this.value;
        if (!selectedColumn) return;
        
        // 检查是否已有此列的表单
        const existingForm = document.getElementById(`dist-form-${selectedColumn}`);
        if (existingForm) {
            // 如果已存在，则聚焦到该表单
            existingForm.scrollIntoView({behavior: 'smooth'});
            // 高亮显示一下
            existingForm.classList.add('border-indigo-500');
            setTimeout(() => {
                existingForm.classList.remove('border-indigo-500');
            }, 2000);
            return;
        }
        
        // 特殊处理complain列
        if (selectedColumn === 'complain') {
            createComplainDistributionUI(selectedColumn, formsContainer, distData[selectedColumn] || {});
        } else {
            // 创建新表单
            const distribution = distData[selectedColumn] || {};
            createDistributionForm(formsContainer, selectedColumn, distribution);
        }
        
        // 重置选择
        this.value = '';
    });
    
    container.appendChild(columnSelect);
    
    // 创建表单容器
    const formsContainer = document.createElement('div');
    formsContainer.classList.add('space-y-6');
    container.appendChild(formsContainer);
    
    // 创建现有分布的表单
    if (Object.keys(distData).length > 0) {
        for (const [column, distribution] of Object.entries(distData)) {
            if (column === 'complain') {
                createComplainDistributionUI(column, formsContainer, distribution);
            } else {
                createDistributionForm(formsContainer, column, distribution);
            }
        }
    }
}

function populateTargetPercentages(targetData) {
    const container = document.getElementById('target-percentages-inputs');
    if (!container) return;
    
    // 清空容器
    container.innerHTML = '';
    
    // 如果没有配置选项，则无法构建表单
    if (!configOptions || !configOptions.columns || !configOptions.options) {
        container.innerHTML = `<p class="text-yellow-500">未能加载配置选项，无法构建表单</p>`;
        return;
    }
    
    // 添加选择列的下拉框
    const columnSelect = document.createElement('select');
    columnSelect.classList.add('mb-4', 'rounded-md', 'border-gray-300', 'shadow-sm', 'focus:border-indigo-500', 'focus:ring-indigo-500', 'sm:text-sm');
    columnSelect.id = 'target-column-select';
    
    // 添加一个默认选项
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = '-- 选择要配置的列 --';
    columnSelect.appendChild(defaultOption);
    
    // 添加所有可用列
    configOptions.columns.forEach(column => {
        const option = document.createElement('option');
        option.value = column;
        option.textContent = getColumnDisplayName(column);
        columnSelect.appendChild(option);
    });
    
    // 列选择变化时创建相应的表单
    columnSelect.addEventListener('change', function() {
        const selectedColumn = this.value;
        if (!selectedColumn) return;
        
        // 检查是否已有此列的表单
        const existingForm = document.getElementById(`target-form-${selectedColumn}`);
        if (existingForm) {
            // 如果已存在，则聚焦到该表单
            existingForm.scrollIntoView({behavior: 'smooth'});
            // 高亮显示一下
            existingForm.classList.add('border-indigo-500');
            setTimeout(() => {
                existingForm.classList.remove('border-indigo-500');
            }, 2000);
            return;
        }
        
        // 特殊处理complain列
        if (selectedColumn === 'complain') {
            createComplainTargetPercentageUI(selectedColumn, formsContainer, targetData[selectedColumn] || {});
        } else {
            // 创建新表单
            const percentages = targetData[selectedColumn] || {};
            createTargetPercentageForm(formsContainer, selectedColumn, percentages);
        }
        
        // 重置选择
        this.value = '';
    });
    
    container.appendChild(columnSelect);
    
    // 创建表单容器
    const formsContainer = document.createElement('div');
    formsContainer.classList.add('space-y-6');
    container.appendChild(formsContainer);
    
    // 创建现有目标百分比的表单
    if (Object.keys(targetData).length > 0) {
        for (const [column, percentages] of Object.entries(targetData)) {
            if (column === 'complain') {
                createComplainTargetPercentageUI(column, formsContainer, percentages);
            } else {
                createTargetPercentageForm(formsContainer, column, percentages);
            }
        }
    }
}

// 辅助函数 - 创建分布配置表单
function createDistributionForm(container, column, distribution) {
    // 获取该列的所有选项
    const options = configOptions.options[column] || [];
    if (options.length === 0) return;
    
    // 初始化optionCount变量
    let optionCount = 0;
    
    // 创建表单区域
    const form = document.createElement('div');
    form.id = `dist-form-${column}`;
    form.classList.add('mb-6', 'p-4', 'border', 'border-green-300', 'rounded-md', 'bg-white', 'shadow-sm');
    
    // 标题和删除按钮
    const header = document.createElement('div');
    header.classList.add('flex', 'justify-between', 'items-center', 'mb-3');
    
    const title = document.createElement('h4');
    title.textContent = `${getColumnDisplayName(column)} 分布`;
    title.classList.add('font-medium', 'text-green-700');
    
    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.textContent = '删除';
    deleteButton.classList.add('text-red-500');
    deleteButton.addEventListener('click', () => {
        form.remove();
    });
    
    header.appendChild(title);
    header.appendChild(deleteButton);
    form.appendChild(header);
    
    // 添加平均分配按钮
    const equalDistButton = document.createElement('button');
    equalDistButton.type = 'button';
    equalDistButton.textContent = '平均分配';
    equalDistButton.classList.add('bg-blue-500', 'hover:bg-blue-600', 'text-white', 'py-1', 'px-3', 'rounded-md', 'text-sm', 'mb-3', 'mr-2');
    equalDistButton.addEventListener('click', () => {
        const inputs = inputsContainer.querySelectorAll('input[type="number"]');
        if (inputs.length > 0) {
            // 计算基本平均值（不四舍五入）
            const baseValue = 1 / inputs.length;
            
            // 为每个输入框设置基本值
            inputs.forEach((input, index) => {
                if (index === inputs.length - 1) {
                    // 对最后一项进行调整，确保总和为1
                    let currentSum = 0;
                    for (let i = 0; i < inputs.length - 1; i++) {
                        currentSum += parseFloat(inputs[i].value);
                    }
                    // 最后一项 = 1 - 前面所有项的和
                    const lastValue = Math.max(0, Math.min(1, 1 - currentSum)).toFixed(2);
                    input.value = lastValue;
                } else {
                    // 非最后一项使用基本平均值，保留两位小数
                    input.value = baseValue.toFixed(2);
                }
            });
            
            updateTotal();
        }
    });
    form.appendChild(equalDistButton);
    
    // 创建每个选项的输入
    const inputsContainer = document.createElement('div');
    inputsContainer.classList.add('space-y-2');
    
    // 总计和校验
    const totalRow = document.createElement('div');
    totalRow.classList.add('mt-4', 'pt-2', 'border-t', 'flex', 'items-center', 'justify-between');
    
    const totalLabel = document.createElement('span');
    totalLabel.textContent = '总计:';
    totalLabel.classList.add('font-medium');
    
    const totalValue = document.createElement('span');
    totalValue.id = `dist-total-${column}`;
    totalValue.classList.add('font-medium');
    totalValue.textContent = '0.00';
    
    const validateStatus = document.createElement('span');
    validateStatus.id = `dist-status-${column}`;
    validateStatus.classList.add('text-xs', 'ml-2');
    
    totalRow.appendChild(totalLabel);
    totalRow.appendChild(totalValue);
    totalRow.appendChild(validateStatus);
    
    // 更新总计函数
    function updateTotal() {
        const inputs = inputsContainer.querySelectorAll('input[type="number"]');
        let total = 0;
        
        inputs.forEach(input => {
            const value = parseFloat(input.value) || 0;
            total += value;
        });
        
        totalValue.textContent = total.toFixed(2);
        
        // 验证总计是否为1
        if (Math.abs(total - 1.0) < 0.01) {
            validateStatus.textContent = '✓ 正确';
            validateStatus.classList.remove('text-red-500');
            validateStatus.classList.add('text-green-500');
        } else {
            validateStatus.textContent = '✗ 总计必须为1.0';
            validateStatus.classList.remove('text-green-500');
            validateStatus.classList.add('text-red-500');
        }
    }
    
    // 添加所有选项的输入框
    options.forEach(option => {
        const row = document.createElement('div');
        row.classList.add('flex', 'items-center');
        
        const label = document.createElement('label');
        label.textContent = option;
        label.classList.add('flex-1', 'text-sm');
        
        const input = document.createElement('input');
        input.type = 'number';
        input.name = `dist_${column}_${option}`;
        input.min = '0';
        input.max = '1';
        input.step = '0.01';
        input.value = distribution[option] || '0';
        input.classList.add('w-20', 'ml-2', 'rounded-md', 'border-gray-300', 'shadow-sm', 'focus:border-indigo-500', 'focus:ring-indigo-500', 'sm:text-sm');
        
        // 输入变化时更新总计
        input.addEventListener('input', updateTotal);
        
        row.appendChild(label);
        row.appendChild(input);
        inputsContainer.appendChild(row);
    });
    
    form.appendChild(inputsContainer);
    form.appendChild(totalRow);
    
    // 立即更新总计
    container.appendChild(form);
    updateTotal();
}

// 辅助函数 - 创建目标百分比配置表单
function createTargetPercentageForm(container, column, percentages) {
    // 获取该列的所有选项
    const options = configOptions.options[column] || [];
    if (options.length === 0) return;
    
    // 创建表单区域
    const form = document.createElement('div');
    form.id = `target-form-${column}`;
    form.classList.add('mb-6', 'p-4', 'border', 'border-purple-300', 'rounded-md', 'bg-white', 'shadow-sm');
    
    // 标题和删除按钮
    const header = document.createElement('div');
    header.classList.add('flex', 'justify-between', 'items-center', 'mb-3');
    
    const title = document.createElement('h4');
    title.textContent = `${getColumnDisplayName(column)} 目标百分比`;
    title.classList.add('font-medium', 'text-purple-700');
    
    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.textContent = '删除';
    deleteButton.classList.add('text-red-500');
    deleteButton.addEventListener('click', () => {
        form.remove();
    });
    
    header.appendChild(title);
    header.appendChild(deleteButton);
    form.appendChild(header);
    
    // 添加说明
    const desc = document.createElement('p');
    desc.textContent = '设置目标百分比，总和应小于等于1。未指定部分将随机分配。';
    desc.classList.add('text-sm', 'text-gray-500', 'mb-3');
    form.appendChild(desc);
    
    // 创建每个选项的输入
    const inputsContainer = document.createElement('div');
    inputsContainer.classList.add('space-y-2');
    
    // 总计和校验
    const totalRow = document.createElement('div');
    totalRow.classList.add('mt-4', 'pt-2', 'border-t', 'flex', 'items-center', 'justify-between');
    
    const totalLabel = document.createElement('span');
    totalLabel.textContent = '总计:';
    totalLabel.classList.add('font-medium');
    
    const totalValue = document.createElement('span');
    totalValue.id = `target-total-${column}`;
    totalValue.classList.add('font-medium');
    totalValue.textContent = '0.00';
    
    const validateStatus = document.createElement('span');
    validateStatus.id = `target-status-${column}`;
    validateStatus.classList.add('text-xs', 'ml-2');
    validateStatus.textContent = '✓ 有效';
    validateStatus.classList.add('text-green-500');
    
    totalRow.appendChild(totalLabel);
    totalRow.appendChild(totalValue);
    totalRow.appendChild(validateStatus);
    
    // 添加提示信息
    const helpText = document.createElement('p');
    helpText.textContent = '注意: 目标百分比的和可以小于1，未指定部分将随机分配';
    helpText.classList.add('mt-2', 'text-xs', 'text-gray-500', 'italic');
    
    // 更新总计函数
    function updateTotal() {
        const inputs = inputsContainer.querySelectorAll('input[type="number"]');
        let total = 0;
        
        inputs.forEach(input => {
            const value = parseFloat(input.value) || 0;
            total += value;
        });
        
        totalValue.textContent = total.toFixed(2);
        
        // 验证总计是否小于等于1
        if (total <= 1.0) {
            validateStatus.textContent = '✓ 有效';
            validateStatus.classList.remove('text-red-500');
            validateStatus.classList.add('text-green-500');
        } else {
            validateStatus.textContent = '✗ 总计必须小于等于1.0';
            validateStatus.classList.remove('text-green-500');
            validateStatus.classList.add('text-red-500');
        }
    }
    
    // 添加所有选项的输入框
    options.forEach(option => {
        const row = document.createElement('div');
        row.classList.add('flex', 'items-center', 'mb-2');
        
        const label = document.createElement('label');
        label.textContent = option;
        label.classList.add('flex-1', 'text-sm');
        
        const input = document.createElement('input');
        input.type = 'number';
        input.name = `target_${column}_${option}`;
        input.setAttribute('data-option', option);
        input.min = '0';
        input.max = '1';
        input.step = '0.01';
        input.value = percentages[option] || '0';
        input.classList.add('w-20', 'ml-2', 'rounded-md', 'border-gray-300', 'shadow-sm', 'focus:border-indigo-500', 'focus:ring-indigo-500', 'sm:text-sm');
        
        // 输入变化时更新总计
        input.addEventListener('input', updateTotal);
        
        row.appendChild(label);
        row.appendChild(input);
        inputsContainer.appendChild(row);
    });
    
    // 将容器添加到表单
    form.appendChild(inputsContainer);
    form.appendChild(totalRow);
    form.appendChild(helpText);
    container.appendChild(form);
    
    // 初始更新总计
    updateTotal();
}

// --- Handle Config Save --- (Placeholder)
async function handleConfigSave(event) {
    event.preventDefault(); // Prevent default form submission
    const saveButton = document.getElementById('save-config-button');
    const saveStatus = document.getElementById('save-status');
    if (!saveButton || !saveStatus) return;

    saveButton.disabled = true;
    saveStatus.textContent = '保存中...';
    saveStatus.className = 'mt-2 text-sm text-gray-600'; // Reset color

    // --- 收集表单数据 --- 
    const formData = new FormData(event.target);
    const configUpdate = {
        num_profiles: parseInt(formData.get('num_profiles') || '0', 10),
        output_dir: formData.get('output_dir'),
        filename_prefix: formData.get('filename_prefix') || null, // Send null if empty
        profile_sources_dir: formData.get('profile_sources_dir'),
        fixed_values: collectFixedValues(),
        distributions: collectDistributions(),
        target_percentages: collectTargetPercentages()
    };
    
    // --- 实现调用后端保存配置 ---
    try {
        const response = await fetch('/api/config', { 
            method: 'POST', 
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(configUpdate) 
        });
        
        if (!response.ok) { 
            let errorDetail = "保存配置失败";
            try {
                const errorData = await response.json();
                errorDetail = errorData.detail || JSON.stringify(errorData);
            } catch (e) {
                errorDetail = `服务器错误，状态码: ${response.status}`;
            }
            throw new Error(errorDetail);
        }
        
        const result = await response.json();
        saveStatus.textContent = result.message || '保存成功!';
        saveStatus.className = 'mt-2 text-sm text-green-600';
        
        // 保存成功后重新加载配置显示最新值
        await fetchAndDisplayConfig();
    } catch (error) {
        console.error('保存配置出错:', error);
        saveStatus.textContent = `保存失败: ${error.message}`;
        saveStatus.className = 'mt-2 text-sm text-red-600';
    } finally { 
        saveButton.disabled = false; 
    }
}

// 辅助函数 - 收集固定值
function collectFixedValues() {
    const fixedValues = {};
    const fixedValuesArea = document.getElementById('fixed-values-inputs');
    if (!fixedValuesArea) return fixedValues;
    
    // 获取所有行
    const rows = fixedValuesArea.querySelectorAll('div[id^="fixed-row-"]');
    rows.forEach(row => {
        const columnSelect = row.querySelector('select[name^="fixed_column_"]');
        
        if (!columnSelect || !columnSelect.value) return;
        
        // 不需要特殊处理complain列，统一用select值
        const valueSelect = row.querySelector('select[name^="fixed_value_"]');
        if (valueSelect && valueSelect.value) {
            fixedValues[columnSelect.value] = valueSelect.value;
        }
    });
    
    return fixedValues;
}

// 辅助函数 - 收集分布
function collectDistributions() {
    const distributions = {};
    const formsContainer = document.getElementById('distributions-inputs')?.querySelector('div.space-y-6');
    if (!formsContainer) return distributions;
    
    // 获取所有分布表单
    const forms = formsContainer.querySelectorAll('div[id^="dist-form-"]');
    forms.forEach(form => {
        const column = form.id.replace('dist-form-', '');
        distributions[column] = {};
        
        // 获取该列所有选项的输入
        const inputs = form.querySelectorAll('input[name^="dist_"]');
        inputs.forEach(input => {
            // 获取选项名称
            let option;
            if (column === 'complain') {
                // 对于complain列，从data-option属性获取原始文本
                option = input.getAttribute('data-option');
            } else {
                // 从name中提取，但不是complain列，所以不需要解码
                option = input.name.replace(`dist_${column}_`, '');
            }
            
            const value = parseFloat(input.value) || 0;
            if (value > 0) { // 只包含大于0的值
                distributions[column][option] = value;
            }
        });
        
        // 如果所有值都是0，删除该列的分布配置
        if (Object.keys(distributions[column]).length === 0) {
            delete distributions[column];
        }
    });
    
    return distributions;
}

// 辅助函数 - 收集目标百分比
function collectTargetPercentages() {
    const targetPercentages = {};
    const formsContainer = document.getElementById('target-percentages-inputs')?.querySelector('div.space-y-6');
    if (!formsContainer) return targetPercentages;
    
    // 获取所有目标百分比表单
    const forms = formsContainer.querySelectorAll('div[id^="target-form-"]');
    forms.forEach(form => {
        const column = form.id.replace('target-form-', '');
        targetPercentages[column] = {};
        
        // 获取该列所有选项的输入
        const inputs = form.querySelectorAll('input[name^="target_"]');
        inputs.forEach(input => {
            // 获取选项名称
            let option;
            if (column === 'complain') {
                // 对于complain列，从data-option属性获取原始文本
                option = input.getAttribute('data-option');
            } else {
                // 从name中提取，但不是complain列，所以不需要解码
                option = input.name.replace(`target_${column}_`, '');
            }
            
            const value = parseFloat(input.value) || 0;
            if (value > 0) { // 只包含大于0的值
                targetPercentages[column][option] = value;
            }
        });
        
        // 如果所有值都是0，删除该列的目标百分比配置
        if (Object.keys(targetPercentages[column]).length === 0) {
            delete targetPercentages[column];
        }
    });
    
    return targetPercentages;
}

// --- Generate Button Functionality ---
// 修改生成按钮处理函数，添加自动刷新文件列表
async function handleGenerateClick() {
    const generateButton = document.getElementById('generate-button');
    const generateStatus = document.getElementById('generate-status');
    
    if (!generateButton || !generateStatus) {
        console.error('生成按钮或状态元素不存在');
        return;
    }

    generateButton.disabled = true;
    generateStatus.textContent = '生成请求已发送，请稍候...';
    generateStatus.classList.remove('text-red-500', 'text-green-500');
    generateStatus.classList.add('text-gray-600');

    try {
        const response = await fetch('/api/generate', { method: 'POST' });
        
        if (!response.ok) {
            let errorDetail = "生成文件失败";
            try {
                const errorData = await response.json();
                errorDetail = errorData.detail || JSON.stringify(errorData);
            } catch (e) {
                errorDetail = `服务器错误，状态码: ${response.status}`;
            }
            throw new Error(errorDetail);
        }
        
        const result = await response.json();
        generateStatus.textContent = result.message || '文件生成成功!';
        generateStatus.classList.remove('text-gray-600', 'text-red-500');
        generateStatus.classList.add('text-green-500');
        
        // 稍等片刻后刷新文件列表
        setTimeout(() => {
            fetchAndDisplayFiles();
        }, 500);
    } catch (error) {
        console.error('生成文件出错:', error);
        generateStatus.textContent = `生成失败: ${error.message}`;
        generateStatus.classList.remove('text-gray-600', 'text-green-500');
        generateStatus.classList.add('text-red-500');
    } finally {
        generateButton.disabled = false;
    }
}

// 修改createComplainDistributionUI函数，改为简单的多选界面
function createComplainDistributionUI(column, container, distribution) {
    // 创建表单区域
    const form = document.createElement('div');
    form.id = `dist-form-${column}`;
    form.classList.add('mb-6', 'p-4', 'border', 'border-green-300', 'rounded-md', 'bg-white', 'shadow-sm');
    
    // 标题和删除按钮
    const header = document.createElement('div');
    header.classList.add('flex', 'justify-between', 'items-center', 'mb-3');
    
    const title = document.createElement('h4');
    title.textContent = `${getColumnDisplayName(column)} 分布`;
    title.classList.add('font-medium', 'text-green-700');
    
    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.textContent = '删除';
    deleteButton.classList.add('text-red-500');
    deleteButton.addEventListener('click', () => {
        form.remove();
    });
    
    header.appendChild(title);
    header.appendChild(deleteButton);
    form.appendChild(header);
    
    // 添加说明
    const desc = document.createElement('p');
    desc.textContent = '请选择抱怨内容选项设置分布，各选项之和必须为1。';
    desc.classList.add('text-sm', 'text-gray-500', 'mb-3');
    form.appendChild(desc);
    
    // 创建选项列表区域
    const inputsContainer = document.createElement('div');
    inputsContainer.classList.add('space-y-2', 'my-3');
    form.appendChild(inputsContainer);
    
    // 添加平均分配按钮
    const equalDistButton = document.createElement('button');
    equalDistButton.type = 'button';
    equalDistButton.textContent = '平均分配';
    equalDistButton.classList.add('bg-blue-500', 'hover:bg-blue-600', 'text-white', 'py-1', 'px-3', 'rounded-md', 'text-sm', 'mb-3', 'mr-2');
    form.appendChild(equalDistButton);
    
    equalDistButton.addEventListener('click', () => {
        const inputs = inputsContainer.querySelectorAll('input[type="number"]');
        if (inputs.length > 0) {
            // 计算基本平均值（不四舍五入）
            const baseValue = 1 / inputs.length;
            
            // 为每个输入框设置基本值
            inputs.forEach((input, index) => {
                if (index === inputs.length - 1) {
                    // 对最后一项进行调整，确保总和为1
                    let currentSum = 0;
                    for (let i = 0; i < inputs.length - 1; i++) {
                        currentSum += parseFloat(inputs[i].value);
                    }
                    // 最后一项 = 1 - 前面所有项的和
                    const lastValue = Math.max(0, Math.min(1, 1 - currentSum)).toFixed(2);
                    input.value = lastValue;
                } else {
                    // 非最后一项使用基本平均值，保留两位小数
                    input.value = baseValue.toFixed(2);
                }
            });
            
            updateTotal();
        }
    });
    
    // 添加下拉选择
    const selectContainer = document.createElement('div');
    selectContainer.classList.add('mb-4');
    
    const selectLabel = document.createElement('div');
    selectLabel.textContent = '选择抱怨内容：';
    selectLabel.classList.add('text-sm', 'font-medium', 'mb-2');
    
    const select = document.createElement('select');
    select.classList.add('w-full', 'rounded-md', 'border-gray-300', 'shadow-sm', 'focus:border-indigo-500', 'focus:ring-indigo-500', 'sm:text-sm');
    
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = '-- 选择抱怨内容 --';
    select.appendChild(defaultOption);
    
    // 获取所有抱怨选项
    const complainOptions = configOptions.options[column] || [];
    
    // 添加所有抱怨选项到下拉列表
    complainOptions.forEach(option => {
        const optionElement = document.createElement('option');
        optionElement.value = option;
        optionElement.textContent = option;
        
        // 如果已经被添加到列表中，禁用该选项
        const selector = `input[data-option="${CSS.escape(option)}"]`;
        if (inputsContainer.querySelector(selector)) {
            optionElement.disabled = true;
        }
        
        select.appendChild(optionElement);
    });
    
    // 添加按钮
    const addButton = document.createElement('button');
    addButton.type = 'button';
    addButton.textContent = '添加选项';
    addButton.classList.add('mt-2', 'bg-blue-500', 'hover:bg-blue-600', 'text-white', 'py-1', 'px-3', 'rounded-md', 'text-sm');
    
    selectContainer.appendChild(selectLabel);
    selectContainer.appendChild(select);
    selectContainer.appendChild(addButton);
    form.appendChild(selectContainer);
    
    // 总计和校验
    const totalRow = document.createElement('div');
    totalRow.classList.add('mt-4', 'pt-2', 'border-t', 'flex', 'items-center', 'justify-between');
    
    const totalLabel = document.createElement('span');
    totalLabel.textContent = '总计:';
    totalLabel.classList.add('font-medium');
    
    const totalValue = document.createElement('span');
    totalValue.id = `dist-total-${column}`;
    totalValue.classList.add('font-medium');
    totalValue.textContent = '0.00';
    
    const validateStatus = document.createElement('span');
    validateStatus.id = `dist-status-${column}`;
    validateStatus.classList.add('text-xs', 'ml-2');
    validateStatus.textContent = '✗ 总计必须为1.0';
    validateStatus.classList.add('text-red-500');
    
    totalRow.appendChild(totalLabel);
    totalRow.appendChild(totalValue);
    totalRow.appendChild(validateStatus);
    form.appendChild(totalRow);
    
    // 添加已有的选项
    if (distribution) {
        Object.keys(distribution).forEach(option => {
            addOptionToDistribution(option, distribution[option]);
            
            // 禁用已添加的选项
            Array.from(select.options).forEach(optElement => {
                if (optElement.value === option) {
                    optElement.disabled = true;
                }
            });
        });
    }
    
    // 更新总计函数
    function updateTotal() {
        const inputs = inputsContainer.querySelectorAll('input[type="number"]');
        let total = 0;
        
        inputs.forEach(input => {
            const value = parseFloat(input.value) || 0;
            total += value;
        });
        
        totalValue.textContent = total.toFixed(2);
        
        // 验证总计是否为1
        if (Math.abs(total - 1.0) < 0.01) {
            validateStatus.textContent = '✓ 正确';
            validateStatus.classList.remove('text-red-500');
            validateStatus.classList.add('text-green-500');
        } else {
            validateStatus.textContent = '✗ 总计必须为1.0';
            validateStatus.classList.remove('text-green-500');
            validateStatus.classList.add('text-red-500');
        }
    }
    
    // 添加选项到分布列表的函数
    function addOptionToDistribution(option, value = 0) {
        const row = document.createElement('div');
        row.classList.add('flex', 'items-center', 'mb-2');
        
        const label = document.createElement('label');
        label.textContent = option;
        label.classList.add('flex-1', 'text-sm');
        
        const input = document.createElement('input');
        input.type = 'number';
        input.name = `dist_${column}_${option}`;
        input.setAttribute('data-option', option);
        input.min = '0';
        input.max = '1';
        input.step = '0.01';
        input.value = value || '0';
        input.classList.add('w-20', 'ml-2', 'rounded-md', 'border-gray-300', 'shadow-sm', 'focus:border-indigo-500', 'focus:ring-indigo-500', 'sm:text-sm');
        
        // 输入变化时更新总计
        input.addEventListener('input', updateTotal);
        
        const removeButton = document.createElement('button');
        removeButton.type = 'button';
        removeButton.innerHTML = '&times;';
        removeButton.classList.add('ml-2', 'text-red-500', 'font-bold');
        removeButton.addEventListener('click', () => {
            row.remove();
            
            // 重新启用被移除的选项
            Array.from(select.options).forEach(optElement => {
                if (optElement.value === option) {
                    optElement.disabled = false;
                }
            });
            
            updateTotal();
        });
        
        row.appendChild(label);
        row.appendChild(input);
        row.appendChild(removeButton);
        inputsContainer.appendChild(row);
        
        updateTotal();
    }
    
    // 添加按钮点击事件
    addButton.addEventListener('click', () => {
        const selectedOption = select.value;
        
        if (!selectedOption) return;
        
        // 添加选项
        addOptionToDistribution(selectedOption, 0);
        
        // 禁用已添加的选项
        Array.from(select.options).forEach(option => {
            if (option.value === selectedOption) {
                option.disabled = true;
            }
        });
        
        // 重置选择
        select.value = '';
    });
    
    container.appendChild(form);
}

// 修改createComplainTargetPercentageUI函数，同样使用简单的下拉选择
function createComplainTargetPercentageUI(column, container, percentages) {
    // 创建表单区域
    const form = document.createElement('div');
    form.id = `target-form-${column}`;
    form.classList.add('mb-6', 'p-4', 'border', 'border-purple-300', 'rounded-md', 'bg-white', 'shadow-sm');
    
    // 标题和删除按钮
    const header = document.createElement('div');
    header.classList.add('flex', 'justify-between', 'items-center', 'mb-3');
    
    const title = document.createElement('h4');
    title.textContent = `${getColumnDisplayName(column)} 目标百分比`;
    title.classList.add('font-medium', 'text-purple-700');
    
    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.textContent = '删除';
    deleteButton.classList.add('text-red-500');
    deleteButton.addEventListener('click', () => {
        form.remove();
    });
    
    header.appendChild(title);
    header.appendChild(deleteButton);
    form.appendChild(header);
    
    // 添加说明
    const desc = document.createElement('p');
    desc.textContent = '请选择抱怨内容选项设置目标百分比，总和应小于等于1。';
    desc.classList.add('text-sm', 'text-gray-500', 'mb-3');
    form.appendChild(desc);
    
    // 创建选项列表区域
    const inputsContainer = document.createElement('div');
    inputsContainer.classList.add('space-y-2', 'my-3');
    form.appendChild(inputsContainer);
    
    // 添加下拉选择
    const selectContainer = document.createElement('div');
    selectContainer.classList.add('mb-4');
    
    const selectLabel = document.createElement('div');
    selectLabel.textContent = '选择抱怨内容：';
    selectLabel.classList.add('text-sm', 'font-medium', 'mb-2');
    
    const select = document.createElement('select');
    select.classList.add('w-full', 'rounded-md', 'border-gray-300', 'shadow-sm', 'focus:border-indigo-500', 'focus:ring-indigo-500', 'sm:text-sm');
    
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = '-- 选择抱怨内容 --';
    select.appendChild(defaultOption);
    
    // 获取所有抱怨选项
    const complainOptions = configOptions.options[column] || [];
    
    // 添加所有抱怨选项到下拉列表
    complainOptions.forEach(option => {
        const optionElement = document.createElement('option');
        optionElement.value = option;
        optionElement.textContent = option;
        select.appendChild(optionElement);
    });
    
    // 添加按钮
    const addButton = document.createElement('button');
    addButton.type = 'button';
    addButton.textContent = '添加选项';
    addButton.classList.add('mt-2', 'bg-blue-500', 'hover:bg-blue-600', 'text-white', 'py-1', 'px-3', 'rounded-md', 'text-sm');
    
    selectContainer.appendChild(selectLabel);
    selectContainer.appendChild(select);
    selectContainer.appendChild(addButton);
    form.appendChild(selectContainer);
    
    // 总计和校验
    const totalRow = document.createElement('div');
    totalRow.classList.add('mt-4', 'pt-2', 'border-t', 'flex', 'items-center', 'justify-between');
    
    const totalLabel = document.createElement('span');
    totalLabel.textContent = '总计:';
    totalLabel.classList.add('font-medium');
    
    const totalValue = document.createElement('span');
    totalValue.id = `target-total-${column}`;
    totalValue.classList.add('font-medium');
    totalValue.textContent = '0.00';
    
    const validateStatus = document.createElement('span');
    validateStatus.id = `target-status-${column}`;
    validateStatus.classList.add('text-xs', 'ml-2');
    validateStatus.textContent = '✓ 有效';
    validateStatus.classList.add('text-green-500');
    
    totalRow.appendChild(totalLabel);
    totalRow.appendChild(totalValue);
    totalRow.appendChild(validateStatus);
    form.appendChild(totalRow);
    
    // 添加提示信息
    const helpText = document.createElement('p');
    helpText.textContent = '注意: 目标百分比的和可以小于1，未指定部分将随机分配';
    helpText.classList.add('mt-2', 'text-xs', 'text-gray-500', 'italic');
    form.appendChild(helpText);
    
    // 添加已有的选项
    if (percentages) {
        Object.keys(percentages).forEach(option => {
            addOptionToTargetPercentage(option, percentages[option]);
            
            // 禁用已添加的选项
            Array.from(select.options).forEach(optElement => {
                if (optElement.value === option) {
                    optElement.disabled = true;
                }
            });
        });
    }
    
    // 更新总计函数
    function updateTotal() {
        const inputs = inputsContainer.querySelectorAll('input[type="number"]');
        let total = 0;
        
        inputs.forEach(input => {
            const value = parseFloat(input.value) || 0;
            total += value;
        });
        
        totalValue.textContent = total.toFixed(2);
        
        // 验证总计是否小于等于1
        if (total <= 1.0) {
            validateStatus.textContent = '✓ 有效';
            validateStatus.classList.remove('text-red-500');
            validateStatus.classList.add('text-green-500');
        } else {
            validateStatus.textContent = '✗ 总计必须小于等于1.0';
            validateStatus.classList.remove('text-green-500');
            validateStatus.classList.add('text-red-500');
        }
    }
    
    // 添加选项到目标百分比列表的函数
    function addOptionToTargetPercentage(option, percentage) {
        const row = document.createElement('div');
        row.classList.add('flex', 'items-center', 'mb-2');
        
        const label = document.createElement('label');
        label.textContent = option;
        label.classList.add('flex-1', 'text-sm');
        
        const input = document.createElement('input');
        input.type = 'number';
        input.name = `target_${column}_${option}`;
        input.setAttribute('data-option', option);
        input.min = '0';
        input.max = '1';
        input.step = '0.01';
        input.value = percentage || '0';
        input.classList.add('w-20', 'ml-2', 'rounded-md', 'border-gray-300', 'shadow-sm', 'focus:border-indigo-500', 'focus:ring-indigo-500', 'sm:text-sm');
        
        // 输入变化时更新总计
        input.addEventListener('input', updateTotal);
        
        const removeButton = document.createElement('button');
        removeButton.type = 'button';
        removeButton.innerHTML = '&times;';
        removeButton.classList.add('ml-2', 'text-red-500', 'font-bold');
        removeButton.addEventListener('click', () => {
            row.remove();
            
            // 重新启用被移除的选项
            Array.from(select.options).forEach(optElement => {
                if (optElement.value === option) {
                    optElement.disabled = false;
                }
            });
            
            updateTotal();
        });
        
        row.appendChild(label);
        row.appendChild(input);
        row.appendChild(removeButton);
        inputsContainer.appendChild(row);
        
        updateTotal();
    }
    
    // 添加按钮点击事件
    addButton.addEventListener('click', () => {
        const selectedOption = select.value;
        
        if (!selectedOption) return;
        
        // 添加选项
        addOptionToTargetPercentage(selectedOption, 0);
        
        // 禁用已添加的选项
        Array.from(select.options).forEach(option => {
            if (option.value === selectedOption) {
                option.disabled = true;
            }
        });
        
        // 重置选择
        select.value = '';
    });
    
    // 将容器添加到表单
    form.appendChild(inputsContainer);
    form.appendChild(totalRow);
    form.appendChild(helpText);
    container.appendChild(form);
}
    