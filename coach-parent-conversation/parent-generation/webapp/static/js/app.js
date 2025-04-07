// JavaScript code will be added here later

// 在页面加载后执行
document.addEventListener('DOMContentLoaded', () => {
    // 获取并显示文件列表
    fetchAndDisplayFiles();
    
    // 获取并显示配置
    fetchAndDisplayConfig();
    
    // 绑定生成按钮事件
    const generateButton = document.getElementById('generate-button');
    if (generateButton) {
        generateButton.addEventListener('click', handleGenerateClick);
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
            files.forEach(filename => {
                const listItem = document.createElement('li');
                const link = document.createElement('a');
                // Encode filename component for URL safety
                const encodedFilename = encodeURIComponent(filename);
                link.href = `/api/files/download/${encodedFilename}`;
                link.textContent = filename;
                link.classList.add('text-blue-600', 'hover:text-blue-800', 'hover:underline');
                // 强制浏览器下载文件而非打开
                link.setAttribute('download', filename);
                listItem.appendChild(link);
                fileListElement.appendChild(listItem);
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

        // Add simple input fields
        form.appendChild(createInputElement('num_profiles', 'num_profiles', '生成数量:', 'number', configData.num_profiles || 1));
        form.appendChild(createInputElement('output_dir', 'output_dir', '输出目录:', 'text', configData.output_dir || '../output'));
        form.appendChild(createInputElement('filename_prefix', 'filename_prefix', '文件名前缀 (可选):', 'text', configData.filename_prefix, 'e.g., experiment1'));
        form.appendChild(createInputElement('profile_sources_dir', 'profile_sources_dir', '源文件目录:', 'text', configData.profile_sources_dir || '../parent-profile'));

        // Placeholders for complex sections
        const advancedTitle = document.createElement('h3');
        advancedTitle.textContent = '高级配置';
        advancedTitle.classList.add('text-lg', 'font-medium', 'text-gray-900', 'mt-6', 'mb-2', 'border-t', 'pt-4');
        form.appendChild(advancedTitle);

        const fixedValuesArea = document.createElement('div');
        fixedValuesArea.id = 'fixed-values-area';
        fixedValuesArea.innerHTML = '<h4 class="font-medium text-gray-700 mb-1">固定值 (Fixed Values)</h4><p class="text-sm text-gray-500 mb-3">为特定列指定固定值 (优先级最高)。</p><div id="fixed-values-inputs"><!-- Inputs added here later --></div>';
        form.appendChild(fixedValuesArea);

        const distributionsArea = document.createElement('div');
        distributionsArea.id = 'distributions-area';
        distributionsArea.innerHTML = '<h4 class="font-medium text-gray-700 mt-4 mb-1">完整分布 (Distributions)</h4><p class="text-sm text-gray-500 mb-3">为特定列的所有选项指定精确比例 (和必须为1)。</p><div id="distributions-inputs"><!-- Inputs added here later --></div>';
        form.appendChild(distributionsArea);

        const targetPercentagesArea = document.createElement('div');
        targetPercentagesArea.id = 'target-percentages-area';
        targetPercentagesArea.innerHTML = '<h4 class="font-medium text-gray-700 mt-4 mb-1">目标百分比 (Target Percentages)</h4><p class="text-sm text-gray-500 mb-3">为特定列的部分选项指定目标比例 (剩余随机)。</p><div id="target-percentages-inputs"><!-- Inputs added here later --></div>';
        form.appendChild(targetPercentagesArea);

        // Save Button
        const saveButtonDiv = document.createElement('div');
        saveButtonDiv.classList.add('mt-6', 'border-t', 'pt-4');
        const saveButton = document.createElement('button');
        saveButton.type = 'submit';
        saveButton.id = 'save-config-button';
        saveButton.textContent = '保存配置';
        saveButton.classList.add('bg-green-600', 'hover:bg-green-700', 'text-white', 'font-bold', 'py-2', 'px-4', 'rounded-md', 'transition', 'duration-150', 'ease-in-out', 'disabled:opacity-50');
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
    row.classList.add('flex', 'flex-wrap', 'gap-2', 'mb-2', 'items-center');
    
    // 第一个下拉框 - 选择列
    const columnSelect = document.createElement('select');
    columnSelect.classList.add('rounded-md', 'border-gray-300', 'shadow-sm', 'focus:border-indigo-500', 'focus:ring-indigo-500', 'sm:text-sm');
    columnSelect.name = `fixed_column_${rowId}`;
    
    // 添加一个空选项
    const emptyOption = document.createElement('option');
    emptyOption.value = '';
    emptyOption.textContent = '-- 选择列 --';
    columnSelect.appendChild(emptyOption);
    
    // 添加所有可用列（使用双语显示）
    configOptions.columns.forEach(column => {
        if (column === 'complain') return;
        
        const option = document.createElement('option');
        option.value = column;
        option.textContent = getColumnDisplayName(column);
        option.selected = column === selectedColumn;
        columnSelect.appendChild(option);
    });
    
    // 第二个下拉框 - 选择值（会根据选择的列动态变化）
    const valueSelect = document.createElement('select');
    valueSelect.classList.add('rounded-md', 'border-gray-300', 'shadow-sm', 'focus:border-indigo-500', 'focus:ring-indigo-500', 'sm:text-sm');
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

// 辅助函数 - 更新值下拉框的选项
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
        // complain列不支持分布配置
        if (column === 'complain') return;
        
        const option = document.createElement('option');
        option.value = column;
        option.textContent = column;
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
        
        // 创建新表单
        const distribution = distData[selectedColumn] || {};
        createDistributionForm(formsContainer, selectedColumn, distribution);
        
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
            createDistributionForm(formsContainer, column, distribution);
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
        // complain列不支持目标百分比配置
        if (column === 'complain') return;
        
        const option = document.createElement('option');
        option.value = column;
        option.textContent = column;
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
        
        // 创建新表单
        const percentages = targetData[selectedColumn] || {};
        createTargetPercentageForm(formsContainer, selectedColumn, percentages);
        
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
            createTargetPercentageForm(formsContainer, column, percentages);
        }
    }
}

// 辅助函数 - 创建分布配置表单
function createDistributionForm(container, column, distribution) {
    // 获取该列的所有选项
    const options = configOptions.options[column] || [];
    if (options.length === 0) return;
    
    // 创建表单区域
    const form = document.createElement('div');
    form.id = `dist-form-${column}`;
    form.classList.add('mb-6', 'p-4', 'border', 'border-gray-200', 'rounded-md');
    
    // 标题和删除按钮
    const header = document.createElement('div');
    header.classList.add('flex', 'justify-between', 'items-center', 'mb-3');
    
    const title = document.createElement('h4');
    title.textContent = `${getColumnDisplayName(column)} 分布`;
    title.classList.add('font-medium');
    
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
    totalValue.classList.add('font-medium');
    
    const validateStatus = document.createElement('span');
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
    form.classList.add('mb-6', 'p-4', 'border', 'border-gray-200', 'rounded-md');
    
    // 标题和删除按钮
    const header = document.createElement('div');
    header.classList.add('flex', 'justify-between', 'items-center', 'mb-3');
    
    const title = document.createElement('h4');
    title.textContent = `${getColumnDisplayName(column)} 目标百分比`;
    title.classList.add('font-medium');
    
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
    totalValue.classList.add('font-medium');
    
    const validateStatus = document.createElement('span');
    validateStatus.classList.add('text-xs', 'ml-2');
    
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
        row.classList.add('flex', 'items-center');
        
        const label = document.createElement('label');
        label.textContent = option;
        label.classList.add('flex-1', 'text-sm');
        
        const input = document.createElement('input');
        input.type = 'number';
        input.name = `target_${column}_${option}`;
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
    
    form.appendChild(inputsContainer);
    form.appendChild(totalRow);
    form.appendChild(helpText);
    
    // 立即更新总计
    container.appendChild(form);
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
        const valueSelect = row.querySelector('select[name^="fixed_value_"]');
        
        if (columnSelect && valueSelect && columnSelect.value && valueSelect.value) {
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
            const option = input.name.replace(`dist_${column}_`, '');
            const value = parseFloat(input.value) || 0;
            distributions[column][option] = value;
        });
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
            const option = input.name.replace(`target_${column}_`, '');
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
const generateButton = document.getElementById('generate-button');
const generateStatus = document.getElementById('generate-status');

// 修改生成按钮处理函数，添加自动刷新文件列表
async function handleGenerateClick() {
    if (!generateButton || !generateStatus) return;

    generateButton.disabled = true;
    generateStatus.textContent = '生成请求已发送，请稍候...';
    generateStatus.classList.remove('text-red-500', 'text-green-500');
    generateStatus.classList.add('text-gray-600');

    try {
        const response = await fetch('/api/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
        });

        if (!response.ok) {
            let errorDetail = "生成失败。";
            try {
                const errorData = await response.json();
                errorDetail = errorData.detail || JSON.stringify(errorData);
            } catch (e) {
                errorDetail = `服务器错误，状态码: ${response.status}`;
            }
            throw new Error(errorDetail);
        }

        const result = await response.json();
        generateStatus.textContent = result.message || '生成成功完成！';
        generateStatus.classList.remove('text-gray-600');
        generateStatus.classList.add('text-green-500');

        // 立即刷新文件列表
        await fetchAndDisplayFiles();
        
        // 2秒后再次刷新文件列表，以确保捕获到最新生成的文件
        setTimeout(fetchAndDisplayFiles, 2000);

    } catch (error) {
        console.error('Error triggering generation:', error);
        generateStatus.textContent = `生成出错: ${error.message}`;
        generateStatus.classList.remove('text-gray-600');
        generateStatus.classList.add('text-red-500');
    } finally {
        generateButton.disabled = false;
    }
}
