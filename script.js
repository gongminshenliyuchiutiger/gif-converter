document.addEventListener('DOMContentLoaded', () => {
    const imageUpload = document.getElementById('imageUpload');
    const previewArea = document.getElementById('previewArea');
    const emptyMessage = document.getElementById('emptyMessage'); // 新增空狀態提示
    const frameDurationInput = document.getElementById('frameDuration');
    const gifRepeatInput = document.getElementById('gifRepeat');
    const createGifBtn = document.getElementById('createGifBtn');
    const generatedGif = document.getElementById('generatedGif');
    const downloadGif = document.getElementById('downloadGif');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const clearImagesBtn = document.getElementById('clearImagesBtn');

    // 儲存圖片數據：{ id: uniqueId, file: File, dataURL: string }
    let uploadedFilesData = []; 
    let draggedItem = null; // 拖曳中的圖片元素

    // Helper: 渲染預覽區
    function renderPreview() {
        previewArea.innerHTML = ''; // 清空預覽區
        
        if (uploadedFilesData.length === 0) {
            emptyMessage.style.display = 'block';
            clearImagesBtn.style.display = 'none';
            previewArea.appendChild(emptyMessage);
            return;
        }

        emptyMessage.style.display = 'none'; // 有圖片時隱藏提示
        clearImagesBtn.style.display = 'block';

        uploadedFilesData.forEach(item => {
            const previewItem = document.createElement('div');
            previewItem.className = 'preview-item';
            previewItem.draggable = true;
            previewItem.dataset.fileId = item.id; // 使用唯一的 ID 作為數據標識

            const img = document.createElement('img');
            img.src = item.dataURL;
            img.alt = `圖片 ${item.id}`; // 使用 ID 作為 alt

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-button';
            deleteBtn.innerHTML = '&times;';
            deleteBtn.onclick = (event) => {
                event.stopPropagation(); // 阻止事件冒泡到父層的拖曳事件
                removeImage(item.id); // 根據 ID 移除圖片
            };

            previewItem.appendChild(img);
            previewItem.appendChild(deleteBtn);
            previewArea.appendChild(previewItem);
        });
    }

    // 處理新上傳的圖片
    async function handleNewFiles(files) {
        for (const file of files) {
            if (file.type.startsWith('image/')) {
                const dataURL = await readFileAsDataURL(file);
                uploadedFilesData.push({
                    id: Date.now() + Math.random(), // 簡單的唯一 ID
                    file: file,
                    dataURL: dataURL
                });
            }
        }
        renderPreview();
    }

    // 讀取檔案為 Data URL 的 Promise 封裝
    function readFileAsDataURL(file) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.readAsDataURL(file);
        });
    }

    // 移除圖片
    function removeImage(idToRemove) {
        uploadedFilesData = uploadedFilesData.filter(item => item.id !== idToRemove);
        renderPreview(); // 重新渲染預覽區
    }

    // 處理圖片上傳
    imageUpload.addEventListener('change', async (event) => {
        const files = Array.from(event.target.files);
        await handleNewFiles(files);
        event.target.value = null; // 清空 input 讓使用者可以重複上傳相同檔案
    });

    // 拖曳上傳功能
    previewArea.addEventListener('dragover', (e) => {
        e.preventDefault(); // 允許放置
        e.stopPropagation(); // 阻止事件向上傳播
        previewArea.classList.add('drag-over');
    });

    previewArea.addEventListener('dragleave', (e) => {
        e.stopPropagation();
        previewArea.classList.remove('drag-over');
    });

    previewArea.addEventListener('drop', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        previewArea.classList.remove('drag-over');

        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) {
            await handleNewFiles(files);
        }
    });

    // 拖曳排序功能 (事件委派)
    previewArea.addEventListener('dragstart', (e) => {
        if (e.target.classList.contains('preview-item')) {
            draggedItem = e.target;
            e.dataTransfer.effectAllowed = 'move';
            // 延遲添加 class，避免拖曳圖像本身透明化
            setTimeout(() => {
                e.target.classList.add('dragging');
            }, 0); 
        }
    });

    previewArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        // 確保不是拖曳自身，且目標是預覽項目
        if (draggedItem && e.target.closest('.preview-item') && e.target.closest('.preview-item') !== draggedItem) {
            const targetItem = e.target.closest('.preview-item');
            const boundingBox = targetItem.getBoundingClientRect();
            const offset = boundingBox.x + (boundingBox.width / 2);
            if (e.clientX > offset) {
                previewArea.insertBefore(draggedItem, targetItem.nextSibling);
            } else {
                previewArea.insertBefore(draggedItem, targetItem);
            }
        }
    });

    previewArea.addEventListener('dragend', () => {
        if (draggedItem) {
            draggedItem.classList.remove('dragging');
            draggedItem = null;
        }

        // 拖曳結束後，根據 DOM 順序更新 uploadedFilesData 陣列
        const newOrderedFilesData = [];
        Array.from(previewArea.children).forEach(domItem => {
            // 確保不是空消息元素
            if (domItem.classList.contains('preview-item')) { 
                const fileId = domItem.dataset.fileId;
                const originalItem = uploadedFilesData.find(item => item.id == fileId);
                if (originalItem) {
                    newOrderedFilesData.push(originalItem);
                }
            }
        });
        uploadedFilesData = newOrderedFilesData;
        // 不需重新 renderPreview，因為 DOM 順序已正確
    });
    
    // 清除所有圖片
    clearImagesBtn.addEventListener('click', () => {
        if (confirm('確定要清除所有圖片嗎？')) {
            uploadedFilesData = [];
            renderPreview();
            generatedGif.style.display = 'none';
            downloadGif.style.display = 'none';
        }
    });

    // 生成 GIF
    createGifBtn.addEventListener('click', async () => {
        if (uploadedFilesData.length < 2) {
            alert('請至少上傳兩張圖片來生成 GIF。');
            return;
        }

        generatedGif.style.display = 'none';
        downloadGif.style.display = 'none';
        loadingIndicator.style.display = 'flex'; // 顯示載入指示器
        loadingIndicator.textContent = '正在生成 GIF...'; // 重置文本

        const duration = parseInt(frameDurationInput.value, 10);
        const repeat = parseInt(gifRepeatInput.value, 10);

        if (isNaN(duration) || duration < 50) {
            alert('每幀持續時間必須是至少50毫秒的有效數字。');
            loadingIndicator.style.display = 'none';
            return;
        }

        const gif = new GIF({
            workers: 2, // 使用兩個 worker
            quality: 10, // 圖像質量 (1-100, 10是預設)
            width: 0,    // 稍後根據第一張圖片設定
            height: 0,   // 稍後根據第一張圖片設定
            repeat: repeat, // 0 = infinite, -1 = no repeat, N = repeat N times
            background: '#fff' // 預設背景色
        });

        // 遍歷並添加圖片到 GIF
        for (let i = 0; i < uploadedFilesData.length; i++) {
            const item = uploadedFilesData[i];
            const img = new Image();
            img.src = item.dataURL; // 使用預先生成的 Data URL

            await new Promise(resolve => {
                img.onload = () => {
                    // 如果這是第一張圖片，設定 GIF 的寬高
                    if (i === 0) {
                        gif.options.width = img.naturalWidth;
                        gif.options.height = img.naturalHeight;
                    }
                    gif.addFrame(img, { delay: duration });
                    resolve();
                };
                img.onerror = () => {
                    console.error(`圖片加載失敗: ${item.file.name}`);
                    resolve(); // 即使失敗也繼續，避免卡死
                };
            });
        }

        gif.on('finished', (blob) => {
            generatedGif.src = URL.createObjectURL(blob);
            generatedGif.style.display = 'block';
            downloadGif.href = generatedGif.src;
            downloadGif.style.display = 'block';
            loadingIndicator.style.display = 'none'; // 隱藏載入指示器
            console.log('GIF generated!');
        });

        gif.on('progress', (p) => {
            console.log(`GIF 生成進度: ${Math.round(p * 100)}%`);
            loadingIndicator.textContent = `正在生成 GIF... ${Math.round(p * 100)}%`;
        });
        
        gif.on('error', (err) => {
            console.error('GIF 生成錯誤:', err);
            alert('GIF 生成失敗，請檢查圖片或瀏覽器支持。' + (err.message || ''));
            loadingIndicator.style.display = 'none';
        });

        gif.render();
    });

    // 初始渲染
    renderPreview();
});