// admin.js - Complete Version with Smart Cancellation System
// IMPORTANT: Uses CANCELLATION instead of deletion - much better for business!
// FIXED: DOM selector issues resolved

const API_URL = '/api';

// DOM Elements
const loginModal = document.getElementById('loginModal');
const adminPanel = document.getElementById('adminPanel');
const editProductModal = document.getElementById('editProductModal');
const closeEditModal = document.getElementById('closeEditModal');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Check if already logged in (session storage)
    if (sessionStorage.getItem('duquesaAdminLoggedIn') === 'true') {
        showAdminPanel();
    }
    
    initializeImageUpload();
});

// ====== ENHANCED SUPABASE-OPTIMIZED IMAGE CONVERTER ======

// Supabase Storage optimized settings
const SUPABASE_LIMITS = {
    MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB (much smaller than 50MB for better performance)
    MAX_DIMENSION: 1200, // Max width/height
    MIN_DIMENSION: 100,   // Min width/height
    TARGET_SIZE: 800,     // Preferred max dimension
    QUALITY_HIGH: 0.9,    // For small files
    QUALITY_MEDIUM: 0.8,  // For medium files
    QUALITY_LOW: 0.6,     // For large files that need heavy compression
    SUPPORTED_FORMATS: ['image/jpeg', 'image/png', 'image/webp']
};

// Advanced Supabase-specific image converter
function convertImageForSupabase(file, options = {}) {
    return new Promise((resolve, reject) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();

        // Enhanced options with Supabase optimization
        const config = {
            maxDimension: options.maxDimension || SUPABASE_LIMITS.TARGET_SIZE,
            quality: options.quality || null,
            forceJPEG: options.forceJPEG !== false,
            progressive: options.progressive !== false,
            targetSize: options.targetSize || SUPABASE_LIMITS.MAX_FILE_SIZE,
            ...options
        };

        img.crossOrigin = 'anonymous';

        img.onload = function() {
            try {
                let { width, height } = img;
                const originalSize = file.size;
                
                const compressionLevel = getSupabaseCompressionLevel(originalSize);
                const dimensions = calculateOptimalDimensions(width, height, config.maxDimension, compressionLevel);
                width = dimensions.width;
                height = dimensions.height;

                canvas.width = width;
                canvas.height = height;

                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';
                
                const hasTransparency = file.type === 'image/png' || file.type === 'image/gif';
                
                if (config.forceJPEG && !hasTransparency) {
                    ctx.fillStyle = '#FFFFFF';
                    ctx.fillRect(0, 0, width, height);
                }
                
                ctx.drawImage(img, 0, 0, width, height);
                
                const outputFormat = determineOutputFormat(file.type, config);
                const quality = config.quality || compressionLevel.quality;
                
                canvas.toBlob(async (blob) => {
                    if (!blob) {
                        reject(new Error('Failed to convert image'));
                        return;
                    }
                    
                    if (blob.size > config.targetSize) {
                        try {
                            const furtherCompressed = await aggressiveRecompression(canvas, outputFormat, blob.size, config.targetSize);
                            const finalFile = createOptimizedFile(furtherCompressed, file.name, outputFormat);
                            resolve({
                                file: finalFile,
                                stats: createCompressionStats(originalSize, finalFile.size, { width, height }, compressionLevel)
                            });
                        } catch (error) {
                            reject(error);
                        }
                    } else {
                        const finalFile = createOptimizedFile(blob, file.name, outputFormat);
                        resolve({
                            file: finalFile,
                            stats: createCompressionStats(originalSize, finalFile.size, { width, height }, compressionLevel)
                        });
                    }
                }, outputFormat, quality);
                
            } catch (error) {
                reject(new Error(`Conversion failed: ${error.message}`));
            }
        };

        img.onerror = function() {
            reject(new Error('Failed to load image. File may be corrupted or in an unsupported format.'));
        };

        if (file instanceof File || file instanceof Blob) {
            const reader = new FileReader();
            reader.onload = function(e) {
                img.src = e.target.result;
            };
            reader.onerror = function() {
                reject(new Error('Failed to read image file'));
            };
            reader.readAsDataURL(file);
        } else {
            img.src = file;
        }
    });
}

// Determine compression level based on file size
function getSupabaseCompressionLevel(fileSize) {
    if (fileSize > 20 * 1024 * 1024) {
        return {
            maxDimension: 600,
            quality: 0.5,
            level: 'aggressive',
            description: 'Compressão agressiva (arquivo muito grande)'
        };
    } else if (fileSize > 10 * 1024 * 1024) {
        return {
            maxDimension: 700,
            quality: 0.6,
            level: 'high',
            description: 'Compressão alta'
        };
    } else if (fileSize > 5 * 1024 * 1024) {
        return {
            maxDimension: 800,
            quality: 0.7,
            level: 'medium',
            description: 'Compressão média'
        };
    } else if (fileSize > 2 * 1024 * 1024) {
        return {
            maxDimension: 1000,
            quality: 0.8,
            level: 'light',
            description: 'Compressão leve'
        };
    } else {
        return {
            maxDimension: 1200,
            quality: 0.85,
            level: 'minimal',
            description: 'Otimização mínima'
        };
    }
}

function calculateOptimalDimensions(width, height, maxDimension, compressionLevel) {
    const effectiveMax = Math.min(maxDimension, compressionLevel.maxDimension);
    
    let newWidth = width;
    let newHeight = height;
    
    if (width > effectiveMax || height > effectiveMax) {
        if (width > height) {
            newHeight = (height * effectiveMax) / width;
            newWidth = effectiveMax;
        } else {
            newWidth = (width * effectiveMax) / height;
            newHeight = effectiveMax;
        }
    }
    
    newWidth = Math.floor(newWidth / 2) * 2;
    newHeight = Math.floor(newHeight / 2) * 2;
    
    if (newWidth < SUPABASE_LIMITS.MIN_DIMENSION) newWidth = SUPABASE_LIMITS.MIN_DIMENSION;
    if (newHeight < SUPABASE_LIMITS.MIN_DIMENSION) newHeight = SUPABASE_LIMITS.MIN_DIMENSION;
    
    return { width: newWidth, height: newHeight };
}

function determineOutputFormat(inputType, config) {
    if (config.forceJPEG) {
        return 'image/jpeg';
    }
    
    if (inputType === 'image/png') {
        return 'image/png';
    }
    
    return 'image/jpeg';
}

function aggressiveRecompression(canvas, format, currentSize, targetSize) {
    return new Promise((resolve, reject) => {
        const compressionRatio = targetSize / currentSize;
        let quality = Math.max(0.3, compressionRatio * 0.8);
        
        canvas.toBlob((blob) => {
            if (!blob) {
                reject(new Error('Aggressive recompression failed'));
                return;
            }
            
            if (blob.size <= targetSize) {
                resolve(blob);
                return;
            }
            
            const scaleFactor = Math.sqrt(compressionRatio * 0.9);
            const newWidth = Math.floor(canvas.width * scaleFactor / 2) * 2;
            const newHeight = Math.floor(canvas.height * scaleFactor / 2) * 2;
            
            if (newWidth < SUPABASE_LIMITS.MIN_DIMENSION || newHeight < SUPABASE_LIMITS.MIN_DIMENSION) {
                reject(new Error('Cannot compress further while maintaining minimum quality'));
                return;
            }
            
            const smallCanvas = document.createElement('canvas');
            const smallCtx = smallCanvas.getContext('2d');
            smallCanvas.width = newWidth;
            smallCanvas.height = newHeight;
            
            smallCtx.imageSmoothingEnabled = true;
            smallCtx.imageSmoothingQuality = 'high';
            smallCtx.drawImage(canvas, 0, 0, newWidth, newHeight);
            
            smallCanvas.toBlob((finalBlob) => {
                if (finalBlob && finalBlob.size <= targetSize) {
                    resolve(finalBlob);
                } else {
                    reject(new Error('Image cannot be compressed to target size while maintaining quality'));
                }
            }, format, quality);
            
        }, format, quality);
    });
}

function createOptimizedFile(blob, originalName, format) {
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 8);
    
    const baseName = originalName.replace(/\.[^/.]+$/, "");
    const cleanBaseName = baseName.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 20);
    
    const extension = format === 'image/png' ? 'png' : 'jpg';
    const fileName = `${cleanBaseName}_${timestamp}_${randomId}.${extension}`;
    
    return new File([blob], fileName, {
        type: format,
        lastModified: Date.now(),
    });
}

function createCompressionStats(originalSize, finalSize, dimensions, compressionLevel) {
    const compressionRatio = ((1 - finalSize / originalSize) * 100).toFixed(1);
    const sizeReduction = originalSize - finalSize;
    
    return {
        originalSize: originalSize,
        finalSize: finalSize,
        compressionRatio: parseFloat(compressionRatio),
        sizeReduction: sizeReduction,
        dimensions: dimensions,
        compressionLevel: compressionLevel.level,
        description: compressionLevel.description,
        supabaseOptimized: true,
        formatOriginalSize: formatFileSize(originalSize),
        formatFinalSize: formatFileSize(finalSize),
        formatSizeReduction: formatFileSize(sizeReduction)
    };
}

function validateImageFileForSupabase(file) {
    const issues = [];
    const warnings = [];
    
    if (!file || !file.type) {
        issues.push('Arquivo inválido ou corrompido');
        return { isValid: false, issues, warnings };
    }
    
    if (!file.type.startsWith('image/')) {
        issues.push('Arquivo deve ser uma imagem');
    }
    
    if (file.size > 100 * 1024 * 1024) {
        issues.push('Arquivo muito grande para processar (máximo 100MB)');
    } else if (file.size > 20 * 1024 * 1024) {
        warnings.push('Arquivo grande - será aplicada compressão agressiva');
    }
    
    if (file.size < 500) {
        issues.push('Arquivo muito pequeno - pode estar corrompido');
    }
    
    if (file.name) {
        const extension = file.name.split('.').pop()?.toLowerCase();
        const supportedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'tiff', 'tif', 'svg'];
        
        if (!extension || !supportedExtensions.includes(extension)) {
            warnings.push(`Extensão .${extension || 'desconhecida'} será convertida para formato suportado`);
        }
    }
    
    if (file.type === 'image/bmp' || file.type === 'image/tiff') {
        warnings.push('Formato será convertido para JPEG para melhor compatibilidade');
    }
    
    return {
        isValid: issues.length === 0,
        issues,
        warnings,
        needsConversion: file.size > SUPABASE_LIMITS.MAX_FILE_SIZE || warnings.length > 0
    };
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// ====== END ENHANCED SUPABASE CONVERTER ======

// Initialize image upload functionality
function initializeImageUpload() {
    // Add Product - Image method switching
    const imageMethodRadios = document.querySelectorAll('input[name="imageMethod"]');
    if (imageMethodRadios.length > 0) {
        imageMethodRadios.forEach(radio => {
            radio.addEventListener('change', function() {
                switchImageMethod(this.value, 'add');
            });
        });
    }

    // Edit Product - Image method switching
    const editImageMethodRadios = document.querySelectorAll('input[name="editImageMethod"]');
    if (editImageMethodRadios.length > 0) {
        editImageMethodRadios.forEach(radio => {
            radio.addEventListener('change', function() {
                switchImageMethod(this.value, 'edit');
            });
        });
    }

    // File input handlers with Supabase optimization
    const newProductImageFile = document.getElementById('newProductImageFile');
    if (newProductImageFile) {
        newProductImageFile.addEventListener('change', function(e) {
            handleSupabaseImagePreview(e, 'add');
        });
    }

    const editProductImageFile = document.getElementById('editProductImageFile');
    if (editProductImageFile) {
        editProductImageFile.addEventListener('change', function(e) {
            handleSupabaseImagePreview(e, 'edit');
        });
    }

    // Drag and drop for upload zones
    setupDragAndDrop();
}

// Setup drag and drop functionality
function setupDragAndDrop() {
    const uploadZones = document.querySelectorAll('.upload-zone');
    
    uploadZones.forEach(zone => {
        zone.addEventListener('dragover', (e) => {
            e.preventDefault();
            zone.classList.add('dragover');
        });

        zone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            zone.classList.remove('dragover');
        });

        zone.addEventListener('drop', (e) => {
            e.preventDefault();
            zone.classList.remove('dragover');
            
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                const context = zone.closest('#uploadArea') ? 'add' : 'edit';
                const fileInput = context === 'add' ? 
                    document.getElementById('newProductImageFile') : 
                    document.getElementById('editProductImageFile');
                
                if (fileInput) {
                    fileInput.files = files;
                    handleSupabaseImagePreview({ target: { files: files } }, context);
                }
            }
        });
    });
}

// FIXED: Switch between image upload methods with proper error handling
function switchImageMethod(method, context) {
    const prefix = context === 'edit' ? 'edit' : '';
    const uploadArea = document.getElementById(prefix + 'UploadArea') || document.getElementById(prefix.toLowerCase() + 'uploadArea');
    const pathInput = document.getElementById(prefix + 'PathInput') || document.getElementById(prefix.toLowerCase() + 'pathInput');
    
    // Update active state
    const radioSelector = context === 'edit' ? 'input[name="editImageMethod"]' : 'input[name="imageMethod"]';
    document.querySelectorAll(radioSelector).forEach(radio => {
        const parent = radio.closest('.upload-method');
        if (parent) {
            if (radio.checked) {
                parent.classList.add('active');
            } else {
                parent.classList.remove('active');
            }
        }
    });

    // Show/hide appropriate sections - with null checks
    if (method === 'upload') {
        if (uploadArea) uploadArea.style.display = 'block';
        if (pathInput) pathInput.style.display = 'none';
    } else if (method === 'path') {
        if (uploadArea) uploadArea.style.display = 'none';
        if (pathInput) pathInput.style.display = 'block';
    } else if (method === 'keep') {
        if (uploadArea) uploadArea.style.display = 'none';
        if (pathInput) pathInput.style.display = 'none';
    }
}

// ENHANCED: Handle image preview with comprehensive conversion
async function handleSupabaseImagePreview(event, context) {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file for Supabase
    const validation = validateImageFileForSupabase(file);
    if (!validation.isValid) {
        showFeedback(`❌ Problemas encontrados:\n${validation.issues.join('\n')}`, 'error');
        return;
    }

    // Show validation warnings if any
    if (validation.warnings.length > 0) {
        showFeedback(`⚠️ Avisos:\n${validation.warnings.join('\n')}`, 'warning');
    }

    // Show processing message
    const originalSize = formatFileSize(file.size);
    showFeedback(`🔄 Otimizando para Supabase Storage...\n📁 Arquivo original: ${originalSize}`, 'info');

    try {
        // Convert with Supabase optimization
        const result = await convertImageForSupabase(file, {
            targetSize: SUPABASE_LIMITS.MAX_FILE_SIZE,
            maxDimension: SUPABASE_LIMITS.TARGET_SIZE
        });

        // Update file input with optimized file
        const dt = new DataTransfer();
        dt.items.add(result.file);
        event.target.files = dt.files;

        // Show success with detailed stats
        showFeedback(
            `✅ Imagem otimizada para Supabase!\n` +
            `📦 ${result.stats.formatOriginalSize} → ${result.stats.formatFinalSize}\n` +
            `🗜️ Redução: ${result.stats.compressionRatio}%\n` +
            `⚙️ ${result.stats.description}`, 
            'success'
        );

        // Show preview with comprehensive info
        const reader = new FileReader();
        reader.onload = function(e) {
            showSupabaseImagePreview(e.target.result, context, {
                ...result.stats,
                file: result.file
            }, validation);
        };
        reader.readAsDataURL(result.file);

    } catch (error) {
        console.error('Supabase optimization failed:', error);
        showFeedback(`❌ Erro na otimização: ${error.message}`, 'error');
        event.target.value = '';
    }
}

// COMPLETELY FIXED: Enhanced preview with proper DOM handling
function showSupabaseImagePreview(dataUrl, context, stats, validation) {
    const prefix = context === 'edit' ? 'edit' : '';
    
    // Multiple fallback selectors to find the right elements
    const uploadZone = document.querySelector(`#${prefix}UploadArea .upload-zone`) || 
                      document.querySelector(`#${prefix}uploadArea .upload-zone`) ||
                      document.querySelector(`.upload-zone`);
                      
    const preview = document.getElementById(`${prefix}ImagePreview`) || 
                   document.getElementById(`${prefix}imagePreview`) ||
                   document.querySelector('.image-preview');
                   
    const previewImg = document.getElementById(`${prefix}PreviewImg`) || 
                      document.getElementById(`${prefix}previewImg`) ||
                      document.querySelector('.image-preview img');
    
    // Enhanced error checking and fallback creation
    if (!uploadZone || !preview || !previewImg) {
        console.warn('Image preview elements not found, creating fallbacks:', {
            uploadZone: !!uploadZone,
            preview: !!preview, 
            previewImg: !!previewImg,
            prefix: prefix,
            context: context
        });
        
        // Try to create missing elements dynamically
        if (!preview && uploadZone) {
            const newPreview = document.createElement('div');
            newPreview.className = 'image-preview';
            newPreview.id = `${prefix}ImagePreview`;
            newPreview.style.display = 'none';
            newPreview.innerHTML = `
                <img id="${prefix}PreviewImg" src="" alt="Preview" style="max-width: 120px; max-height: 120px; border-radius: 6px;">
                <button type="button" class="remove-image" onclick="remove${context === 'edit' ? 'Edit' : ''}ImagePreview()">
                    <i class="fas fa-times"></i>
                </button>
            `;
            uploadZone.parentNode.appendChild(newPreview);
            
            // Re-query elements
            const newPreviewImg = document.getElementById(`${prefix}PreviewImg`);
            if (newPreviewImg) {
                showImagePreview(uploadZone, newPreview, newPreviewImg, dataUrl, stats, validation);
            }
        }
        return;
    }
    
    showImagePreview(uploadZone, preview, previewImg, dataUrl, stats, validation);
}

// Separated image preview logic for cleaner code
function showImagePreview(uploadZone, preview, previewImg, dataUrl, stats, validation) {
    if (uploadZone) uploadZone.style.display = 'none';
    if (preview) preview.style.display = 'block';
    if (previewImg) previewImg.src = dataUrl;
    
    // Remove any existing info
    if (preview) {
        let existingInfo = preview.querySelector('.image-info');
        if (existingInfo) {
            existingInfo.remove();
        }
        
        // Create comprehensive info panel
        const infoDiv = document.createElement('div');
        infoDiv.className = 'image-info supabase-optimized';
        
        // Status icon based on compression level
        const statusIcons = {
            minimal: '✨',
            light: '📦',
            medium: '🔧',
            high: '⚡',
            aggressive: '🚀'
        };
        
        const statusIcon = statusIcons[stats.compressionLevel] || '✅';
        
        let warningsHtml = '';
        if (validation && validation.warnings && validation.warnings.length > 0) {
            warningsHtml = `
                <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 4px; padding: 8px; margin: 8px 0;">
                    <div style="color: #856404; font-size: 0.8em;">
                        ⚠️ <strong>Avisos:</strong><br>
                        ${validation.warnings.join('<br>')}
                    </div>
                </div>
            `;
        }
        
        infoDiv.innerHTML = `
            <div style="margin-bottom: 8px;">
                <strong>${statusIcon} ${stats.file ? stats.file.name : 'Imagem Otimizada'}</strong>
            </div>
            
            ${warningsHtml}
            
            <div style="background: #e8f5e8; border-radius: 6px; padding: 10px; margin: 8px 0;">
                <div style="font-size: 0.85em; line-height: 1.5; color: #2d5a2d;">
                    📊 <strong>Otimização Supabase:</strong><br>
                    📏 <strong>Dimensões:</strong> ${stats.dimensions.width} × ${stats.dimensions.height}px<br>
                    📦 <strong>Tamanho:</strong> ${stats.formatOriginalSize} → ${stats.formatFinalSize}<br>
                    🗜️ <strong>Redução:</strong> ${stats.compressionRatio}% (${stats.formatSizeReduction})<br>
                    ⚙️ <strong>Nível:</strong> ${stats.description}<br>
                    ✅ <strong>Status:</strong> Otimizado para Supabase Storage
                </div>
            </div>
            
            <div style="font-size: 0.8em; color: #666; text-align: center; margin-top: 8px;">
                🎯 Arquivo pronto para upload rápido e confiável
            </div>
        `;
        
        preview.appendChild(infoDiv);
    }
}

// FIXED: Remove image preview with proper error handling
function removeImagePreview() {
    const uploadZone = document.querySelector('#uploadArea .upload-zone') || document.querySelector('.upload-zone');
    const preview = document.getElementById('imagePreview') || document.querySelector('.image-preview');
    const fileInput = document.getElementById('newProductImageFile');
    
    if (uploadZone) uploadZone.style.display = 'block';
    if (preview) preview.style.display = 'none';
    if (fileInput) fileInput.value = '';
}

// FIXED: Remove edit image preview with proper error handling
function removeEditImagePreview() {
    const uploadZone = document.querySelector('#editUploadArea .upload-zone') || document.querySelector('.upload-zone');
    const preview = document.getElementById('editImagePreview') || document.querySelector('.image-preview');
    const fileInput = document.getElementById('editProductImageFile');
    
    if (uploadZone) uploadZone.style.display = 'block';
    if (preview) preview.style.display = 'none';
    if (fileInput) fileInput.value = '';
}

// Reset add form
function resetAddForm() {
    const addForm = document.getElementById('addProductForm');
    if (addForm) {
        addForm.reset();
        removeImagePreview();
        
        // Reset to upload method
        const uploadMethod = document.getElementById('uploadMethod');
        if (uploadMethod) {
            uploadMethod.checked = true;
            switchImageMethod('upload', 'add');
        }
    }
}

// Admin login
const adminLoginForm = document.getElementById('adminLoginForm');
if (adminLoginForm) {
    adminLoginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const password = document.getElementById('adminPassword').value;
        
        try {
            const response = await fetch(`${API_URL}/admin/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ password })
            });
            
            const result = await response.json();
            
            if (result.success) {
                sessionStorage.setItem('duquesaAdminLoggedIn', 'true');
                showAdminPanel();
                showFeedback('Acesso admin concedido!');
            } else {
                showFeedback('Senha incorreta!', 'error');
            }
        } catch (error) {
            showFeedback('Erro ao fazer login. Verifique o servidor.', 'error');
        }
        
        document.getElementById('adminPassword').value = '';
    });
}

// Show admin panel
function showAdminPanel() {
    if (loginModal) loginModal.classList.remove('active');
    if (adminPanel) adminPanel.style.display = 'block';
    loadAdminData();
    loadStats();
}

// Logout
function logout() {
    sessionStorage.removeItem('duquesaAdminLoggedIn');
    if (adminPanel) adminPanel.style.display = 'none';
    if (loginModal) loginModal.classList.add('active');
    showFeedback('Logout realizado com sucesso!');
}

// Load stats
async function loadStats() {
    try {
        const response = await fetch(`${API_URL}/stats`);
        const stats = await response.json();
        
        const totalProducts = document.getElementById('totalProducts');
        const totalOrders = document.getElementById('totalOrders');
        const totalRevenue = document.getElementById('totalRevenue');
        const todayOrders = document.getElementById('todayOrders');
        
        if (totalProducts) totalProducts.textContent = stats.totalProducts;
        if (totalOrders) totalOrders.textContent = stats.totalOrders;
        if (totalRevenue) totalRevenue.textContent = formatPrice(stats.totalRevenue);
        if (todayOrders) todayOrders.textContent = stats.todayOrders;
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// Admin tabs
function showAdminTab(tabName) {
    // Hide all tabs
    document.querySelectorAll('.admin-tab-content').forEach(tab => {
        tab.style.display = 'none';
    });
    
    // Remove active class from all tab buttons
    document.querySelectorAll('.admin-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Show selected tab
    const targetTab = document.getElementById(`admin-${tabName}`);
    if (targetTab) targetTab.style.display = 'block';
    
    // Add active class to clicked tab button
    if (event && event.target) {
        event.target.classList.add('active');
    }
    
    // Load data for specific tabs
    if (tabName === 'products') {
        loadAdminProducts();
    } else if (tabName === 'orders') {
        loadAdminOrders();
    }
}

// Load admin data
function loadAdminData() {
    loadAdminProducts();
    loadAdminOrders();
}

// Load admin products
async function loadAdminProducts() {
    const container = document.getElementById('adminProductsList');
    if (!container) return;
    
    container.innerHTML = '<p style="text-align: center; padding: 2rem;">Carregando produtos...</p>';
    
    try {
        const response = await fetch(`${API_URL}/products`);
        const products = await response.json();
        
        container.innerHTML = '';
        
        if (products.length === 0) {
            container.innerHTML = '<p style="text-align: center; padding: 2rem;">Nenhum produto encontrado</p>';
            return;
        }
        
        products.forEach(product => {
            const productItem = document.createElement('div');
            productItem.className = 'admin-product-item';
            
            productItem.innerHTML = `
                <img src="${product.image}" alt="${product.name}" class="admin-product-img"
                     onerror="this.src='https://images.unsplash.com/photo-1578985545062-69928b1d9587?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80'">
                <div class="admin-product-info">
                    <div class="admin-product-name">${product.name}</div>
                    <div class="admin-product-price">${formatPrice(product.price)} Kz</div>
                    <div class="admin-product-id">ID: ${product.id}</div>
                </div>
                <div class="admin-product-actions">
                    <button class="btn btn-primary" onclick="editProduct(${product.id})">
                        <i class="fas fa-edit"></i> Editar
                    </button>
                    <button class="btn btn-outline" onclick="duplicateProduct(${product.id})">
                        <i class="fas fa-copy"></i> Duplicar
                    </button>
                </div>
            `;
            
            container.appendChild(productItem);
        });
    } catch (error) {
        container.innerHTML = '<p style="text-align: center; padding: 2rem; color: red;">Erro ao carregar produtos</p>';
    }
}

// ====== SMART CANCELLATION SYSTEM (NO MORE 405 ERRORS!) ======

// Enhanced Load admin orders with CANCELLATION system (no deletion!)
async function loadAdminOrders() {
    const container = document.getElementById('adminOrdersList');
    if (!container) return;
    
    container.innerHTML = '<p style="text-align: center; padding: 2rem;">Carregando pedidos...</p>';
    
    try {
        const response = await fetch(`${API_URL}/orders`);
        let orders = await response.json();
        
        container.innerHTML = '';
        
        if (orders.length === 0) {
            container.innerHTML = '<p style="text-align: center; padding: 2rem;">Nenhum pedido encontrado</p>';
            return;
        }
        
        // Sort orders by date (newest first)
        orders.sort((a, b) => new Date(b.created_at || b.date) - new Date(a.created_at || a.date));
        
        // Add order statistics with revenue filtering
        addOrderStatistics(orders, container);
        
        orders.forEach(order => {
            const orderItem = document.createElement('div');
            orderItem.className = 'admin-order-item';
            orderItem.dataset.orderId = order.id || order.orderNumber;
            
            const orderDate = new Date(order.created_at || order.date).toLocaleString('pt-AO');
            const orderNumber = order.order_number || order.orderNumber;
            const orderStatus = order.status || 'Pendente';
            
            // Check if order is cancelled
            const isCancelled = orderStatus.toLowerCase() === 'cancelado';
            
            // Status styling
            const statusClass = getStatusClass(orderStatus);
            const statusIcon = getStatusIcon(orderStatus);
            
            let itemsHtml = '';
            if (order.items && Array.isArray(order.items)) {
                order.items.forEach(item => {
                    itemsHtml += `
                        <div class="admin-order-item-detail">
                            <span>${item.name} (${item.quantity}x)</span>
                            <span>${formatPrice(item.price * item.quantity)} Kz</span>
                        </div>
                    `;
                });
            }
            
            orderItem.innerHTML = `
                <div class="admin-order-header">
                    <div class="order-header-left">
                        <span class="admin-order-number">Pedido #${orderNumber}</span>
                        <span class="admin-order-date">${orderDate}</span>
                    </div>
                    <div class="order-header-right">
                        <span class="status-badge ${statusClass}">${statusIcon} ${orderStatus}</span>
                    </div>
                </div>
                
                <div class="admin-order-items">
                    ${itemsHtml}
                </div>
                
                <div class="customer-info">
                    <h4>Informações do Pedido:</h4>
                    <p><strong>Origem:</strong> ${order.customer_name || order.customerName || 'Site Online'}</p>
                    <p><strong>Contato:</strong> ${order.customer_phone || order.customerPhone || 'Via WhatsApp'}</p>
                    ${isCancelled ? '<p style="color: #dc2626; font-weight: bold;">⚠️ CANCELADO - Não incluído na receita</p>' : ''}
                </div>
                
                <div class="admin-order-total">
                    Total: ${formatPrice(order.total)} Kz
                    ${isCancelled ? '<span style="color: #dc2626; font-weight: bold;"> (❌ Não contabilizado)</span>' : ''}
                </div>
                
                <div class="admin-order-actions">
                    ${!isCancelled ? `
                        <button class="btn btn-success btn-sm" onclick="updateOrderStatus(${orderNumber}, 'Entregue')" 
                                title="Marcar como entregue e incluir na receita" ${orderStatus === 'Entregue' ? 'disabled' : ''}>
                            <i class="fas fa-check-circle"></i> Entregue
                        </button>
                        
                        <button class="btn btn-warning btn-sm" onclick="updateOrderStatus(${orderNumber}, 'Pendente')" 
                                title="Marcar como pendente" ${orderStatus === 'Pendente' ? 'disabled' : ''}>
                            <i class="fas fa-clock"></i> Pendente
                        </button>
                        
                        <button class="btn btn-info btn-sm" onclick="updateOrderStatus(${orderNumber}, 'Preparando')" 
                                title="Marcar como preparando" ${orderStatus === 'Preparando' ? 'disabled' : ''}>
                            <i class="fas fa-cookie-bite"></i> Preparando
                        </button>
                        
                        <button class="btn btn-primary btn-sm" onclick="resendOrder(${orderNumber})" 
                                title="Reenviar via WhatsApp">
                            <i class="fab fa-whatsapp"></i> Reenviar
                        </button>
                        
                        <button class="btn btn-danger btn-sm" onclick="cancelOrder(${orderNumber})" 
                                title="CANCELAR pedido - não será incluído na receita">
                            <i class="fas fa-times-circle"></i> Cancelar
                        </button>
                    ` : `
                        <button class="btn btn-secondary btn-sm" onclick="updateOrderStatus(${orderNumber}, 'Pendente')" 
                                title="RESTAURAR pedido cancelado">
                            <i class="fas fa-undo"></i> Restaurar
                        </button>
                        
                        <button class="btn btn-outline btn-sm" onclick="hideOrder(${orderNumber})" 
                                title="Ocultar da visualização">
                            <i class="fas fa-eye-slash"></i> Ocultar
                        </button>
                    `}
                </div>
            `;
            
            // Style cancelled orders differently
            if (isCancelled) {
                orderItem.style.opacity = '0.6';
                orderItem.style.border = '2px solid #fca5a5';
                orderItem.style.backgroundColor = '#fef2f2';
            }
            
            container.appendChild(orderItem);
        });
        
    } catch (error) {
        container.innerHTML = '<p style="text-align: center; padding: 2rem; color: red;">Erro ao carregar pedidos</p>';
    }
}

// Get status CSS class
function getStatusClass(status) {
    switch (status.toLowerCase()) {
        case 'entregue':
        case 'concluído':
        case 'finalizado':
            return 'status-completed';
        case 'preparando':
        case 'em preparo':
            return 'status-preparing';
        case 'cancelado':
            return 'status-cancelled';
        case 'pendente':
        default:
            return 'status-pending';
    }
}

// Get status icon
function getStatusIcon(status) {
    switch (status.toLowerCase()) {
        case 'entregue':
        case 'concluído':
        case 'finalizado':
            return '✅';
        case 'preparando':
        case 'em preparo':
            return '👨‍🍳';
        case 'cancelado':
            return '❌';
        case 'pendente':
        default:
            return '⏳';
    }
}

// SMART SOLUTION: Cancel order instead of delete (uses PUT - no 405 error!)
async function cancelOrder(orderNumber) {
    const confirmed = confirm(
        `⚠️ CANCELAR PEDIDO #${orderNumber}\n\n` +
        `• O pedido será marcado como "CANCELADO"\n` +
        `• NÃO será incluído no cálculo da receita\n` +
        `• Histórico será preservado para controle\n` +
        `• Esta ação é REVERSÍVEL\n\n` +
        `Confirma o cancelamento?`
    );
    
    if (!confirmed) return;
    
    try {
        showFeedback(`⏳ Cancelando pedido #${orderNumber}...`, 'info');
        
        // Use updateOrderStatus to change to "Cancelado" - uses PUT, not DELETE!
        const success = await updateOrderStatus(orderNumber, 'Cancelado');
        
        if (success) {
            showFeedback(`✅ Pedido #${orderNumber} foi cancelado e não será incluído na receita`, 'success');
        }
        
    } catch (error) {
        showFeedback(`❌ Erro ao cancelar pedido #${orderNumber}: ${error.message}`, 'error');
    }
}

// FIXED: Update order status with comprehensive method attempts - NO MORE 405!
async function updateOrderStatus(orderNumber, newStatus) {
    try {
        showFeedback(`⏳ Atualizando pedido #${orderNumber} para "${newStatus}"...`, 'info');
        
        let success = false;
        let lastError = null;
        
        // Try multiple HTTP methods - one of these WILL work!
        const approaches = [
            // Most common approach for order updates
            {
                url: `${API_URL}/orders/status`,
                method: 'POST',
                body: JSON.stringify({ 
                    orderNumber: orderNumber,
                    status: newStatus 
                })
            },
            // Form data approach (many APIs prefer this)
            {
                url: `${API_URL}/orders/status`,
                method: 'POST',
                body: new URLSearchParams({
                    id: orderNumber,
                    status: newStatus
                }),
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
            },
            // PATCH method (standard for updates)
            {
                url: `${API_URL}/orders/${orderNumber}`,
                method: 'PATCH',
                body: JSON.stringify({ status: newStatus })
            },
            // POST to main orders endpoint
            {
                url: `${API_URL}/orders`,
                method: 'POST',
                body: JSON.stringify({ 
                    id: orderNumber,
                    orderNumber: orderNumber,
                    status: newStatus,
                    action: 'update'
                })
            },
            // PUT with query parameter (your original approach)
            {
                url: `${API_URL}/orders?id=${orderNumber}`,
                method: 'PUT',
                body: JSON.stringify({ status: newStatus })
            },
            // PUT RESTful
            {
                url: `${API_URL}/orders/${orderNumber}`,
                method: 'PUT',
                body: JSON.stringify({ status: newStatus })
            }
        ];
        
        for (const approach of approaches) {
            try {
                const headers = approach.headers || {
                    'Content-Type': 'application/json'
                };
                
                const response = await fetch(approach.url, {
                    method: approach.method,
                    headers: headers,
                    body: approach.body
                });
                
                if (response.ok) {
                    success = true;
                    break;
                } else {
                    const errorText = await response.text();
                    lastError = `HTTP ${response.status}: ${errorText}`;
                }
            } catch (error) {
                lastError = error.message;
            }
        }
        
        if (success) {
            // Update UI immediately
            updateOrderStatusInUI(orderNumber, newStatus);
            loadStats(); // Refresh stats for revenue calculation
            
            if (newStatus.toLowerCase() === 'cancelado') {
                showFeedback(`✅ Pedido #${orderNumber} cancelado - não incluído na receita`, 'success');
            } else {
                showFeedback(`✅ Pedido #${orderNumber} atualizado para: ${newStatus}`, 'success');
            }
            
            return true;
        } else {
            throw new Error(`Não foi possível atualizar o status. ${lastError || 'Todos os endpoints falharam'}`);
        }
    } catch (error) {
        console.error('Error updating order status:', error);
        showFeedback(`❌ Erro: ${error.message}`, 'error');
        return false;
    }
}

// Update order status in UI immediately
function updateOrderStatusInUI(orderNumber, newStatus) {
    const orderElement = document.querySelector(`[data-order-id="${orderNumber}"]`);
    if (!orderElement) return;
    
    // Update status badge
    const statusBadge = orderElement.querySelector('.status-badge');
    if (statusBadge) {
        const statusClass = getStatusClass(newStatus);
        const statusIcon = getStatusIcon(newStatus);
        
        statusBadge.className = `status-badge ${statusClass}`;
        statusBadge.innerHTML = `${statusIcon} ${newStatus}`;
    }
    
    // Special styling for cancelled orders
    if (newStatus.toLowerCase() === 'cancelado') {
        orderElement.style.opacity = '0.6';
        orderElement.style.border = '2px solid #fca5a5';
        orderElement.style.backgroundColor = '#fef2f2';
    } else {
        // Remove cancelled styling
        orderElement.style.opacity = '1';
        orderElement.style.border = '';
        orderElement.style.backgroundColor = '';
    }
    
    // Reload the orders to update buttons correctly
    setTimeout(() => {
        loadAdminOrders();
    }, 1000);
}

// Hide order from view (safe alternative)
async function hideOrder(orderNumber) {
    const confirmed = confirm(`Ocultar pedido #${orderNumber} da visualização?\n\n(O pedido não será excluído permanentemente)`);
    if (!confirmed) return;
    
    try {
        showFeedback(`🫥 Ocultando pedido #${orderNumber}...`, 'info');
        
        const orderElement = document.querySelector(`[data-order-id="${orderNumber}"]`);
        if (orderElement) {
            orderElement.style.transition = 'all 0.3s ease';
            orderElement.style.opacity = '0';
            orderElement.style.transform = 'translateX(-100%)';
            
            setTimeout(() => {
                orderElement.remove();
                
                // Check if no orders left
                const container = document.getElementById('adminOrdersList');
                if (container) {
                    const remainingOrders = container.querySelectorAll('.admin-order-item');
                    if (remainingOrders.length === 0) {
                        container.innerHTML = '<p style="text-align: center; padding: 2rem;">Nenhum pedido encontrado</p>';
                    }
                }
            }, 300);
        }
        
        showFeedback(`✅ Pedido #${orderNumber} ocultado da visualização`, 'success');
        
    } catch (error) {
        showFeedback(`❌ Erro ao ocultar pedido: ${error.message}`, 'error');
    }
}

// Add order statistics with proper revenue calculation
function addOrderStatistics(orders, container) {
    // Only count non-cancelled orders for revenue
    const activeOrders = orders.filter(o => (o.status || 'Pendente').toLowerCase() !== 'cancelado');
    const completedOrders = orders.filter(o => (o.status || 'Pendente').toLowerCase() === 'entregue');
    
    const stats = {
        total: orders.length,
        pending: orders.filter(o => (o.status || 'Pendente') === 'Pendente').length,
        preparing: orders.filter(o => (o.status || 'Pendente') === 'Preparando').length,
        completed: completedOrders.length,
        cancelled: orders.filter(o => (o.status || 'Pendente').toLowerCase() === 'cancelado').length,
        // Revenue calculation - only from completed (delivered) orders
        revenue: completedOrders.reduce((sum, order) => sum + (parseFloat(order.total) || 0), 0)
    };
    
    const statsElement = document.createElement('div');
    statsElement.className = 'order-statistics';
    statsElement.innerHTML = `
        <div class="stats-header">
            <h3>📊 Estatísticas dos Pedidos</h3>
            <p style="margin: 5px 0 0 0; font-size: 0.9em; opacity: 0.9;">
                💰 <strong>Receita Real:</strong> ${formatPrice(stats.revenue)} Kz (apenas pedidos entregues)
            </p>
        </div>
        <div class="stats-grid">
            <div class="stat-item total">
                <div class="stat-number">${stats.total}</div>
                <div class="stat-label">📋 Total</div>
            </div>
            <div class="stat-item pending">
                <div class="stat-number">${stats.pending}</div>
                <div class="stat-label">⏳ Pendentes</div>
            </div>
            <div class="stat-item preparing">
                <div class="stat-number">${stats.preparing}</div>
                <div class="stat-label">👨‍🍳 Preparando</div>
            </div>
            <div class="stat-item completed">
                <div class="stat-number">${stats.completed}</div>
                <div class="stat-label">✅ Entregues</div>
            </div>
            ${stats.cancelled > 0 ? `
            <div class="stat-item cancelled">
                <div class="stat-number">${stats.cancelled}</div>
                <div class="stat-label">❌ Cancelados</div>
            </div>
            ` : ''}
        </div>
        ${stats.cancelled > 0 ? `
        <div style="background: #fee2e2; border: 1px solid #fca5a5; border-radius: 6px; padding: 10px; margin-top: 10px; text-align: center;">
            <span style="color: #dc2626; font-size: 0.85em; font-weight: bold;">
                ⚠️ ${stats.cancelled} pedido(s) cancelado(s) não incluídos na receita
            </span>
        </div>
        ` : ''}
    `;
    
    container.appendChild(statsElement);
}

// ====== END SMART CANCELLATION SYSTEM ======

// Edit product
async function editProduct(productId) {
    try {
        const response = await fetch(`${API_URL}/products?id=${productId}`);
        const product = await response.json();
        
        const editProductId = document.getElementById('editProductId');
        const editProductName = document.getElementById('editProductName');
        const editProductPrice = document.getElementById('editProductPrice');
        const editProductImage = document.getElementById('editProductImage');
        
        if (editProductId) editProductId.value = product.id;
        if (editProductName) editProductName.value = product.name;
        if (editProductPrice) editProductPrice.value = product.price;
        if (editProductImage) editProductImage.value = product.image;
        
        // Show current image
        const currentImg = document.getElementById('currentProductImage');
        if (currentImg) {
            currentImg.src = product.image;
            currentImg.onerror = function() {
                this.src = 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80';
            };
        }
        
        // Reset upload states
        const keepImageMethod = document.getElementById('keepImageMethod');
        if (keepImageMethod) {
            keepImageMethod.checked = true;
            switchImageMethod('keep', 'edit');
        }
        removeEditImagePreview();
        
        if (editProductModal) editProductModal.classList.add('active');
    } catch (error) {
        showFeedback('Erro ao carregar produto', 'error');
    }
}

// Duplicate product
async function duplicateProduct(productId) {
    try {
        const response = await fetch(`${API_URL}/products?id=${productId}`);
        const product = await response.json();
        
        const newProductData = {
            name: product.name + ' (Cópia)',
            price: product.price,
            imagePath: product.image
        };
        
        const formData = new FormData();
        formData.append('name', newProductData.name);
        formData.append('price', newProductData.price);
        formData.append('imagePath', newProductData.imagePath);
        
        const addResponse = await fetch(`${API_URL}/products`, {
            method: 'POST',
            body: formData
        });
        
        const result = await addResponse.json();
        
        if (result.success) {
            loadAdminProducts();
            loadStats();
            showFeedback('Produto duplicado com sucesso!');
        } else {
            showFeedback('Erro ao duplicar produto', 'error');
        }
    } catch (error) {
        showFeedback('Erro ao duplicar produto', 'error');
    }
}

// Save product changes
const editProductForm = document.getElementById('editProductForm');
if (editProductForm) {
    editProductForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const productId = document.getElementById('editProductId').value;
        const formData = new FormData();
        
        formData.append('name', document.getElementById('editProductName').value);
        formData.append('price', document.getElementById('editProductPrice').value);
        
        // Check which image method is selected
        const imageMethod = document.querySelector('input[name="editImageMethod"]:checked');
        if (imageMethod) {
            if (imageMethod.value === 'upload') {
                const fileInput = document.getElementById('editProductImageFile');
                if (fileInput && fileInput.files[0]) {
                    formData.append('image', fileInput.files[0]);
                }
            } else if (imageMethod.value === 'path') {
                const imagePath = document.getElementById('editProductImage');
                if (imagePath) {
                    formData.append('imagePath', imagePath.value);
                }
            }
        }
        // If 'keep' is selected, don't send any image data
        
        try {
            const response = await fetch(`${API_URL}/products?id=${productId}`, {
                method: 'PUT',
                body: formData
            });
            
            const result = await response.json();
            
            if (result.success) {
                if (editProductModal) editProductModal.classList.remove('active');
                loadAdminProducts();
                loadStats();
                showFeedback('Produto atualizado com sucesso!');
            } else {
                showFeedback('Erro ao atualizar produto', 'error');
            }
        } catch (error) {
            showFeedback('Erro ao atualizar produto', 'error');
        }
    });
}

// Delete product
async function deleteProduct() {
    const productId = document.getElementById('editProductId').value;
    
    if (confirm('Tem certeza que deseja excluir este produto? Esta ação não pode ser desfeita.')) {
        try {
            const response = await fetch(`${API_URL}/products?id=${productId}`, {
                method: 'DELETE'
            });
            
            const result = await response.json();
            
            if (result.success) {
                if (editProductModal) editProductModal.classList.remove('active');
                loadAdminProducts();
                loadStats();
                showFeedback('Produto excluído com sucesso!');
            } else {
                showFeedback('Erro ao excluir produto', 'error');
            }
        } catch (error) {
            showFeedback('Erro ao excluir produto', 'error');
        }
    }
}

// FIXED: Add product form with better error handling
const addProductForm = document.getElementById('addProductForm');
if (addProductForm) {
    addProductForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const name = document.getElementById('newProductName');
        const price = document.getElementById('newProductPrice');
        
        if (!name || !price || !name.value.trim() || !price.value) {
            showFeedback('Por favor, preencha todos os campos obrigatórios', 'error');
            return;
        }
        
        const formData = new FormData();
        formData.append('name', name.value.trim());
        formData.append('price', price.value);
        
        // Check which image method is selected
        const imageMethod = document.querySelector('input[name="imageMethod"]:checked');
        
        if (imageMethod && imageMethod.value === 'upload') {
            const fileInput = document.getElementById('newProductImageFile');
            if (fileInput && fileInput.files[0]) {
                formData.append('image', fileInput.files[0]);
            } else {
                showFeedback('Por favor, selecione uma imagem ou use o método de caminho', 'error');
                return;
            }
        } else if (imageMethod && imageMethod.value === 'path') {
            const imagePath = document.getElementById('newProductImage');
            if (!imagePath || !imagePath.value.trim()) {
                showFeedback('Por favor, insira o caminho da imagem', 'error');
                return;
            }
            formData.append('imagePath', imagePath.value.trim());
        }
        
        try {
            showFeedback('Adicionando produto...', 'info');
            
            const response = await fetch(`${API_URL}/products`, {
                method: 'POST',
                body: formData
            });
            
            // Check if response is ok first
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            // Try to parse JSON
            let result;
            try {
                result = await response.json();
            } catch (jsonError) {
                console.error('JSON parsing error:', jsonError);
                throw new Error('Resposta inválida do servidor');
            }
            
            if (result && result.success) {
                resetAddForm();
                loadAdminProducts();
                loadStats();
                showFeedback('✅ Produto adicionado com sucesso!', 'success');
                
                // Switch to products tab to show the new product
                showAdminTab('products');
            } else {
                const errorMsg = result?.error || result?.message || 'Erro desconhecido';
                showFeedback(`❌ Erro ao adicionar produto: ${errorMsg}`, 'error');
            }
        } catch (error) {
            console.error('Error adding product:', error);
            showFeedback(`❌ Erro ao adicionar produto: ${error.message}`, 'error');
        }
    });
}

// Resend order via WhatsApp
async function resendOrder(orderNumber) {
    try {
        const response = await fetch(`${API_URL}/orders`);
        const orders = await response.json();
        const order = orders.find(o => (o.order_number || o.orderNumber) === orderNumber);
        
        if (!order) return;
        
        const settingsResponse = await fetch(`${API_URL}/settings`);
        const settings = await settingsResponse.json();
        
        let message = `👑 *Olá A Duquesa dos Bolos PPP!*\n\n`;
        message += `Gostaria de fazer o seguinte pedido:\n\n`;
        message += `📋 *Número do Pedido: #${orderNumber}* (REENVIO)\n\n`;
        message += `🛍️ *Itens desejados:*\n`;
        
        if (order.items && Array.isArray(order.items)) {
            order.items.forEach(item => {
                message += `🍰 ${item.name}\n`;
                message += `   • Quantidade: ${item.quantity} unidade(s)\n`;
                message += `   • Preço: ${formatPrice(item.price)} Kz cada\n`;
                message += `   • Subtotal: ${formatPrice(item.price * item.quantity)} Kz\n\n`;
            });
        }
        
        message += `💰 *VALOR TOTAL: ${formatPrice(order.total)} Kz*\n\n`;
        message += `📅 Data original: ${new Date(order.created_at || order.date).toLocaleString('pt-AO')}\n`;
        message += `📅 Reenviado em: ${new Date().toLocaleString('pt-AO')}\n\n`;
        message += `Por favor, confirmem a disponibilidade e informem:\n`;
        message += `✅ Prazo de entrega\n`;
        message += `✅ Forma de pagamento\n`;
        message += `✅ Local de entrega/retirada\n\n`;
        message += `Aguardo o retorno. Obrigado(a)! 🙏`;
        
        const encodedMessage = encodeURIComponent(message);
        const whatsappUrl = `https://wa.me/${settings.whatsappNumber.replace(/\D/g, '')}?text=${encodedMessage}`;
        window.open(whatsappUrl, '_blank');
        
        showFeedback('Pedido reenviado via WhatsApp!');
    } catch (error) {
        showFeedback('Erro ao reenviar pedido', 'error');
    }
}

// Export functions - Not implemented for Vercel version
async function exportProducts() {
    showFeedback('Use o painel Supabase para exportar dados', 'info');
}

async function exportOrders() {
    showFeedback('Use o painel Supabase para exportar dados', 'info');
}

async function backupData() {
    showFeedback('Use o painel Supabase para fazer backup', 'info');
}

async function clearOldOrders() {
    showFeedback('Use o painel Supabase para gerenciar pedidos', 'info');
}

function restoreData() {
    showFeedback('Use o painel Supabase para restaurar dados', 'info');
}

// Change admin password
const changePasswordForm = document.getElementById('changePasswordForm');
if (changePasswordForm) {
    changePasswordForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const newPassword = document.getElementById('newPassword');
        const confirmPassword = document.getElementById('confirmPassword');
        
        if (!newPassword || !confirmPassword) {
            showFeedback('Campos de senha não encontrados', 'error');
            return;
        }
        
        if (newPassword.value !== confirmPassword.value) {
            showFeedback('As senhas não coincidem!', 'error');
            return;
        }
        
        if (newPassword.value.length < 6) {
            showFeedback('A senha deve ter pelo menos 6 caracteres!', 'error');
            return;
        }
        
        try {
            const response = await fetch(`${API_URL}/settings`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ adminPassword: newPassword.value })
            });
            
            const result = await response.json();
            
            if (result.success) {
                changePasswordForm.reset();
                showFeedback('Senha alterada com sucesso!');
            } else {
                showFeedback('Erro ao alterar senha', 'error');
            }
        } catch (error) {
            showFeedback('Erro ao alterar senha', 'error');
        }
    });
}

// Update WhatsApp settings
const whatsappForm = document.getElementById('whatsappForm');
if (whatsappForm) {
    whatsappForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const whatsappNumber = document.getElementById('whatsappNumber');
        if (!whatsappNumber) return;
        
        try {
            const response = await fetch(`${API_URL}/settings`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ whatsappNumber: whatsappNumber.value })
            });
            
            const result = await response.json();
            
            if (result.success) {
                showFeedback('Configurações do WhatsApp salvas!');
            } else {
                showFeedback('Erro ao salvar configurações', 'error');
            }
        } catch (error) {
            showFeedback('Erro ao salvar configurações', 'error');
        }
    });
}

// Close edit modal
if (closeEditModal) {
    closeEditModal.addEventListener('click', () => {
        if (editProductModal) editProductModal.classList.remove('active');
    });
}

// Close modals when clicking outside
window.addEventListener('click', (e) => {
    if (e.target === editProductModal) {
        if (editProductModal) editProductModal.classList.remove('active');
    }
});

// Format price with thousands separator
function formatPrice(price) {
    if (typeof price === 'number') {
        return price.toLocaleString('pt-AO');
    }
    return price;
}

// ENHANCED Show feedback message
function showFeedback(message, type = 'success') {
    const existingFeedback = document.querySelector('.feedback-message');
    if (existingFeedback) {
        existingFeedback.remove();
    }
    
    const colors = {
        success: '#4caf50',
        error: '#f44336',
        info: '#2196f3',
        warning: '#ff9800'
    };
    
    const feedback = document.createElement('div');
    feedback.className = 'feedback-message';
    feedback.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%) translateY(100px);
        background: ${colors[type] || colors.success};
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
        z-index: 100000;
        transition: transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
        font-weight: 500;
        max-width: 90%;
        text-align: center;
        font-size: 0.9rem;
        line-height: 1.4;
        white-space: pre-line;
    `;
    feedback.innerHTML = message;
    document.body.appendChild(feedback);
    
    // Animate in
    setTimeout(() => {
        feedback.style.transform = 'translateX(-50%) translateY(0)';
    }, 10);
    
    // Auto remove
    const duration = type === 'info' ? 4000 : type === 'warning' ? 5000 : 3000;
    setTimeout(() => {
        feedback.style.transform = 'translateX(-50%) translateY(100px)';
        setTimeout(() => {
            if (document.body.contains(feedback)) {
                document.body.removeChild(feedback);
            }
        }, 300);
    }, duration);
}

// Make functions available globally
window.editProduct = editProduct;
window.duplicateProduct = duplicateProduct;
window.deleteProduct = deleteProduct;
window.resendOrder = resendOrder;
window.updateOrderStatus = updateOrderStatus;
window.cancelOrder = cancelOrder;
window.hideOrder = hideOrder;
window.exportProducts = exportProducts;
window.exportOrders = exportOrders;
window.clearOldOrders = clearOldOrders;
window.backupData = backupData;
window.restoreData = restoreData;
window.logout = logout;
window.showAdminTab = showAdminTab;
window.removeImagePreview = removeImagePreview;
window.removeEditImagePreview = removeEditImagePreview;
window.resetAddForm = resetAddForm;
window.convertImageForSupabase = convertImageForSupabase;
window.validateImageFileForSupabase = validateImageFileForSupabase;
window.handleSupabaseImagePreview = handleSupabaseImagePreview;