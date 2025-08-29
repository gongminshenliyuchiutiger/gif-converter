document.addEventListener('DOMContentLoaded', () => {
    const imageUpload = document.getElementById('imageUpload');
    const previewArea = document.getElementById('previewArea');
    const emptyMessage = document.getElementById('emptyMessage');
    const batchFrameDurationInput = document.getElementById('batchFrameDuration');
    const applyBatchDurationBtn = document.getElementById('applyBatchDurationBtn');
    const gifRepeatOptions = document.querySelectorAll('.repeat-option-button');
    const gifRepeatCustomInput = document.getElementById('gifRepeatCustomInput');
    const gifRepeatValueHiddenInput = document.getElementById('gifRepeatValue'); // 儲存實際重複次數
    const createGifBtn = document.getElementById('createGifBtn');
    const generatedGif = document.getElementById('generatedGif');
    const downloadGif = document.getElementById('downloadGif');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const clearImagesBtn = document.getElementById('clearImagesBtn');
    const mascot = document.getElementById('mascot');

    // 儲存圖片數據：{ id: uniqueId, file: File, dataURL: string, duration: number }
    let uploadedFilesData = []; 
    let draggedItem = null; // 拖曳中的圖片元素

    // Helper: 渲染預覽區
    function renderPreview() {
        previewArea.innerHTML = ''; // 清空預覽區
        
        if (uploadedFilesData.length === 0) {
            emptyMessage.style.display = 'block';
            clearImagesBtn.style.display = 'none';
            // 將 emptyMessage 重新添加到 previewArea，確保它始終存在
            if (!previewArea.contains(emptyMessage)) {
                 previewArea.appendChild(emptyMessage);
            }
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
            img.alt = `圖片 ${item.id}`; 

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-button';
            deleteBtn.innerHTML = '<i class="fas fa-times"></i>'; // 使用 Font Awesome 圖標
            deleteBtn.onclick = (event) => {
                event.stopPropagation(); // 阻止事件冒泡到父層的拖曳事件
                removeImage(item.id); // 根據 ID 移除圖片
            };

            const durationInput = document.createElement('input');
            durationInput.type = 'number';
            durationInput.className = 'item-duration-input';
            durationInput.value = item.duration;
            durationInput.min = '50';
            durationInput.step = '50';
            durationInput.title = '每幀持續時間 (毫秒)'; // 提示文字
            durationInput.addEventListener('change', (e) => {
                const newDuration = parseInt(e.target.value, 10);
                if (!isNaN(newDuration) && newDuration >= 50) {
                    item.duration = newDuration;
                } else {
                    e.target.value = item.duration; // 如果無效則恢復原值
                    alert('每幀持續時間必須是至少50毫秒的有效數字。');
                }
            });

            previewItem.appendChild(img);
            previewItem.appendChild(deleteBtn);
            previewItem.appendChild(durationInput);
            previewArea.appendChild(previewItem);
        });
    }

    // 處理新上傳的圖片
    async function handleNewFiles(files) {
        // 從批次設定獲取預設持續時間
        const defaultDuration = parseInt(batchFrameDurationInput.value, 10); 
        for (const file of files) {
            if (file.type.startsWith('image/')) {
                const dataURL = await readFileAsDataURL(file);
                uploadedFilesData.push({
                    id: Date.now() + Math.random(), // 簡單的唯一 ID
                    file: file,
                    dataURL: dataURL,
                    duration: defaultDuration // 使用預設持續時間
                });
            }
        }
        renderPreview();
    }

    // 讀取檔案為 Data URL 的 Promise 封裝
    function readFileAsDataURL(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(e);
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

    // 拖曳上傳功能 (對 previewArea 的 drop)
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

        // 檢查是否是拖曳檔案而不是內部元素
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const files = Array.from(e.dataTransfer.files);
            await handleNewFiles(files);
        }
    });

    // 拖曳排序功能 (事件委派)
    previewArea.addEventListener('dragstart', (e) => {
        // 確保拖曳的是預覽項目本身，而不是內部的圖片或輸入框
        if (e.target.classList.contains('preview-item')) {
            draggedItem = e.target;
            e.dataTransfer.effectAllowed = 'move';
            // 延遲添加 class，避免拖曳圖像本身透明化
            setTimeout(() => {
                e.target.classList.add('dragging');
            }, 0); 
        } else {
            e.preventDefault(); // 阻止非預覽項目被拖曳
        }
    });

    previewArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        // 確保有被拖曳的項目，且目標是另一個預覽項目
        if (draggedItem && draggedItem !== e.target && e.target.closest('.preview-item')) {
            const targetItem = e.target.closest('.preview-item');
            if (targetItem && targetItem !== draggedItem) { // 確保目標不是拖曳中的自己
                const boundingBox = targetItem.getBoundingClientRect();
                // 判斷滑鼠是在目標元素左半邊還是右半邊
                const offset = boundingBox.x + (boundingBox.width / 2);
                if (e.clientX > offset) {
                    // 滑鼠在目標元素右側，插入到目標元素之後
                    previewArea.insertBefore(draggedItem, targetItem.nextSibling);
                } else {
                    // 滑鼠在目標元素左側，插入到目標元素之前
                    previewArea.insertBefore(draggedItem, targetItem);
                }
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
                const fileId = parseFloat(domItem.dataset.fileId); // 使用 parseFloat for consistency with Date.now()
                const originalItem = uploadedFilesData.find(item => item.id === fileId);
                if (originalItem) {
                    newOrderedFilesData.push(originalItem);
                }
            }
        });
        uploadedFilesData = newOrderedFilesData;
        // 注意：這裡不重新 renderPreview，因為 DOM 已經被拖曳操作改變，
        // 重新渲染會導致視覺閃爍並破壞拖曳體驗。
        // 資料模型已更新，下次調用 renderPreview 時會是正確順序。
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

    // 批次應用時間
    applyBatchDurationBtn.addEventListener('click', () => {
        const batchDuration = parseInt(batchFrameDurationInput.value, 10);
        if (isNaN(batchDuration) || batchDuration < 50) {
            alert('批次設定的時間必須是至少50毫秒的有效數字。');
            return;
        }

        if (uploadedFilesData.length === 0) {
            alert('沒有圖片可以應用批次設定。');
            return;
        }

        uploadedFilesData.forEach(item => {
            item.duration = batchDuration;
        });
        renderPreview(); // 重新渲染以更新所有圖片上的時間輸入框
    });

    // GIF 重複選項按鈕邏輯
    gifRepeatOptions.forEach(button => {
        button.addEventListener('click', () => {
            gifRepeatOptions.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');

            if (button.dataset.repeatCustom !== undefined) {
                gifRepeatCustomInput.disabled = false;
                gifRepeatValueHiddenInput.value = gifRepeatCustomInput.value;
            } else {
                gifRepeatCustomInput.disabled = true;
                gifRepeatValueHiddenInput.value = button.dataset.repeat;
            }
        });
    });

    gifRepeatCustomInput.addEventListener('change', () => {
        const customValue = parseInt(gifRepeatCustomInput.value, 10);
        if (isNaN(customValue) || customValue < 1) {
            alert('重複次數必須是至少1次的有效數字。');
            gifRepeatCustomInput.value = 1; // 恢復預設值
            gifRepeatValueHiddenInput.value = 1;
        } else {
            gifRepeatValueHiddenInput.value = customValue;
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

        const repeat = parseInt(gifRepeatValueHiddenInput.value, 10);

        const gif = new GIF({
            workers: 2, // 使用兩個 worker
            quality: 10, // 圖像質量 (1-100, 10是預設)
            width: 0,    // 稍後根據第一張圖片設定
            height: 0,   // 稍後根據第一張圖片設定
            repeat: repeat, // 0 = infinite, -1 = no repeat, N = repeat N times
            background: '#fff', // 預設背景色
            workerScript: 'gif.worker.js' // 明確指定 worker 腳本路徑
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
                    // 使用每張圖片單獨設定的 duration
                    gif.addFrame(img, { delay: item.duration }); 
                    resolve();
                };
                img.onerror = () => {
                    console.error(`圖片加載失敗: ${item.file.name}`);
                    alert(`圖片 "${item.file.name}" 加載失敗，將跳過此圖片。`);
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

    // 吉祥物點擊效果 (confetti)
    mascot.addEventListener('click', () => {
        // 從滑鼠點擊位置發射粒子
        confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.8 }, // 從底部發射
            colors: ['#a864fd', '#29cdff', '#78ff44', '#ff718d', '#fdff6a'] // 多彩粒子
        });
    });

    // 初始渲染
    renderPreview();
});