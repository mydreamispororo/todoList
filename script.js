// Todo List 애플리케이션
class TodoApp {
    constructor() {
        this.todos = [];
        this.isDarkMode = false;
        this.editingId = null;
        this.autoBackupEnabled = false;
        this.autoBackupInterval = null;
        this._storageData = null;
        
        this.init();
    }

    init() {
        this.loadFromStorage();
        this.bindEvents();
        this.updateUI();
    }

    // 이벤트 바인딩
    bindEvents() {
        // 할 일 추가 폼
        document.getElementById('add-todo-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addTodo();
        });

        // 테마 토글
        document.getElementById('theme-toggle').addEventListener('click', () => {
            this.toggleTheme();
        });

        // 할 일 목록 클릭 이벤트 (이벤트 위임)
        document.getElementById('todo-list').addEventListener('click', (e) => {
            this.handleTodoClick(e);
        });

        // 할 일 목록 키보드 이벤트 (Enter로 저장)
        document.getElementById('todo-list').addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey && (e.target.classList.contains('editing'))) {
                e.preventDefault();
                const todoItem = e.target.closest('.todo-item');
                if (todoItem) {
                    this.saveEdit(todoItem.dataset.id);
                }
            }
        });

        // 백업/복원 기능
        document.getElementById('export-btn').addEventListener('click', () => {
            this.exportData();
        });

        document.getElementById('import-btn').addEventListener('click', () => {
            document.getElementById('file-input').click();
        });

        document.getElementById('file-input').addEventListener('change', (e) => {
            this.importData(e);
        });

        // 자동 백업 토글
        document.getElementById('auto-backup-btn').addEventListener('click', () => {
            this.toggleAutoBackup();
        });
    }

    // 할 일 추가
    addTodo() {
        const textInput = document.getElementById('todo-input');
        const memoInput = document.getElementById('memo-input');
        const timeInput = document.getElementById('time-input');
        
        const text = textInput.value.trim();
        const memo = memoInput.value.trim();
        const time = timeInput.value;
        
        if (text) {
            const todo = {
                id: Date.now().toString(),
                text: text,
                memo: memo,
                time: time,
                completed: false,
                createdAt: new Date().toISOString()
            };
            
            this.todos.unshift(todo); // 최신 항목을 맨 위에
            textInput.value = '';
            memoInput.value = '';
            timeInput.value = '';
            this.saveToStorage();
            this.updateUI();

            // 자동 백업이 활성화되어 있으면 백업 수행
            if (this.autoBackupEnabled) {
                this.performAutoBackup();
            }
        }
    }

    // 할 일 토글 (완료/미완료)
    toggleTodo(id) {
        const todo = this.todos.find(t => t.id === id);
        if (todo) {
            todo.completed = !todo.completed;
            this.saveToStorage();
            this.updateUI();

            // 자동 백업이 활성화되어 있으면 백업 수행
            if (this.autoBackupEnabled) {
                this.performAutoBackup();
            }
        }
    }

    // 할 일 삭제
    deleteTodo(id) {
        if (confirm('정말로 이 할 일을 삭제하시겠습니까?')) {
            this.todos = this.todos.filter(t => t.id !== id);
            this.saveToStorage();
            this.updateUI();

            // 자동 백업이 활성화되어 있으면 백업 수행
            if (this.autoBackupEnabled) {
                this.performAutoBackup();
            }
        }
    }

    // 할 일 수정 시작
    startEdit(id) {
        this.editingId = id;
        this.updateUI();
        
        // 수정 모드가 된 후 첫 번째 입력 필드에 포커스
        setTimeout(() => {
            const todoItem = document.querySelector(`[data-id="${id}"]`);
            if (todoItem) {
                const textInput = todoItem.querySelector('.todo-text.editing');
                if (textInput) {
                    textInput.focus();
                }
            }
        }, 0);
    }

    // 할 일 수정 완료
    saveEdit(id) {
        const todoItem = document.querySelector(`[data-id="${id}"]`);
        if (!todoItem) return;

        const textInput = todoItem.querySelector('.todo-text');
        const memoInput = todoItem.querySelector('.todo-memo');
        const timeInput = todoItem.querySelector('.todo-time.editing');

        const newText = textInput.textContent.trim() || textInput.value.trim();
        const newMemo = memoInput ? (memoInput.textContent.trim() || memoInput.value.trim()) : '';
        const newTime = timeInput ? timeInput.value : '';

        const todo = this.todos.find(t => t.id === id);
        if (todo && newText) {
            todo.text = newText;
            todo.memo = newMemo;
            todo.time = newTime;
            this.editingId = null;
            this.saveToStorage();
            this.updateUI();

            // 자동 백업이 활성화되어 있으면 백업 수행
            if (this.autoBackupEnabled) {
                this.performAutoBackup();
            }
        }
    }

    // 할 일 수정 취소
    cancelEdit() {
        this.editingId = null;
        this.updateUI();
    }

    // 할 일 목록 클릭 이벤트 처리
    handleTodoClick(e) {
        const todoItem = e.target.closest('.todo-item');
        if (!todoItem) return;

        const id = todoItem.dataset.id;
        const action = e.target.dataset.action;

        switch (action) {
            case 'toggle':
                this.toggleTodo(id);
                break;
            case 'edit':
                this.startEdit(id);
                break;
            case 'delete':
                this.deleteTodo(id);
                break;
            case 'save':
                this.saveEdit(id);
                break;
            case 'cancel':
                this.cancelEdit();
                break;
        }
    }

    // 테마 토글
    toggleTheme() {
        this.isDarkMode = !this.isDarkMode;
        document.body.classList.toggle('dark', this.isDarkMode);
        
        const themeIcon = document.querySelector('.theme-icon');
        themeIcon.textContent = this.isDarkMode ? '☀️' : '🌙';
        
        this.saveToStorage();
    }

    // UI 업데이트
    updateUI() {
        this.renderTodoList();
        this.updateStats();
        this.toggleEmptyState();
    }

    // 할 일 목록 렌더링
    renderTodoList() {
        const todoList = document.getElementById('todo-list');
        const emptyState = document.getElementById('empty-state');
        
        if (!todoList) return;
        
        if (this.todos.length === 0) {
            todoList.innerHTML = '';
            if (emptyState) {
                todoList.appendChild(emptyState);
            }
            return;
        }

        const todoItems = this.todos.map(todo => this.createTodoItem(todo)).join('');
        todoList.innerHTML = todoItems;
    }

    // 시간을 한국어 형식으로 포맷팅
    formatTime(time) {
        if (!time) return '';
        const [hours, minutes] = time.split(':');
        const hour = parseInt(hours);
        const ampm = hour >= 12 ? '오후' : '오전';
        const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
        return `${ampm} ${displayHour}:${minutes}`;
    }

    // 할 일 아이템 생성
    createTodoItem(todo) {
        const isEditing = this.editingId === todo.id;
        
        return `
            <div class="todo-item ${todo.completed ? 'completed' : ''}" data-id="${todo.id}">
                <div class="todo-main">
                    <input 
                        type="checkbox" 
                        class="todo-checkbox" 
                        ${todo.completed ? 'checked' : ''}
                        data-action="toggle"
                    >
                    <div class="todo-content">
                        ${isEditing ? `
                            <div class="todo-text editing" contenteditable="true">${todo.text}</div>
                        ` : `
                            <div class="todo-text">${todo.text}</div>
                        `}
                        
                        ${todo.memo || isEditing ? `
                            ${isEditing ? `
                                <textarea class="todo-memo editing" placeholder="메모...">${todo.memo}</textarea>
                            ` : `
                                <div class="todo-memo">${todo.memo}</div>
                            `}
                        ` : ''}
                        
                        ${todo.time || isEditing ? `
                            <div style="margin-top: 0.5rem;">
                                ${isEditing ? `
                                    <input type="time" class="todo-time editing" value="${todo.time}">
                                ` : `
                                    <span class="todo-time">⏰ ${this.formatTime(todo.time)}</span>
                                `}
                            </div>
                        ` : ''}
                    </div>
                    <div class="todo-actions">
                        ${isEditing ? `
                            <button class="todo-button save-button" data-action="save">저장</button>
                            <button class="todo-button cancel-button" data-action="cancel">취소</button>
                        ` : `
                            <button class="todo-button edit-button" data-action="edit">수정</button>
                            <button class="todo-button delete-button" data-action="delete">삭제</button>
                        `}
                    </div>
                </div>
            </div>
        `;
    }

    // 통계 업데이트
    updateStats() {
        const totalCount = this.todos.length;
        const completedCount = this.todos.filter(todo => todo.completed).length;
        const pendingCount = totalCount - completedCount;

        const totalElement = document.getElementById('total-count');
        const completedElement = document.getElementById('completed-count');
        const pendingElement = document.getElementById('pending-count');

        if (totalElement) totalElement.textContent = totalCount;
        if (completedElement) completedElement.textContent = completedCount;
        if (pendingElement) pendingElement.textContent = pendingCount;
    }

    // 빈 상태 토글
    toggleEmptyState() {
        const emptyState = document.getElementById('empty-state');
        
        if (emptyState) {
            if (this.todos.length === 0) {
                emptyState.style.display = 'block';
            } else {
                emptyState.style.display = 'none';
            }
        }
    }

    // 데이터 내보내기 (JSON 파일로 다운로드)
    exportData() {
        try {
            const data = {
                todos: this.todos,
                isDarkMode: this.isDarkMode,
                autoBackupEnabled: this.autoBackupEnabled,
                exportDate: new Date().toISOString(),
                version: '1.0'
            };

            const jsonString = JSON.stringify(data, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `todo-backup-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            this.showNotification('데이터를 성공적으로 내보냈습니다!', 'success');
        } catch (error) {
            console.error('Export error:', error);
            this.showNotification('데이터 내보내기 중 오류가 발생했습니다.', 'error');
        }
    }

    // 데이터 가져오기 (JSON 파일에서 복원)
    importData(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const content = e.target.result;
                console.log('File content:', content); // 디버깅용
                
                const data = JSON.parse(content);
                
                // 데이터 유효성 검사
                if (!data || typeof data !== 'object') {
                    throw new Error('올바르지 않은 파일 형식입니다.');
                }
                
                if (!data.todos || !Array.isArray(data.todos)) {
                    throw new Error('올바르지 않은 할 일 데이터 형식입니다.');
                }

                // 각 할 일 항목 유효성 검사
                for (let todo of data.todos) {
                    if (!todo.id || !todo.text) {
                        throw new Error('일부 할 일 데이터가 손상되었습니다.');
                    }
                    // 누락된 필드 기본값 설정
                    if (todo.memo === undefined) todo.memo = '';
                    if (todo.time === undefined) todo.time = '';
                    if (todo.completed === undefined) todo.completed = false;
                    if (!todo.createdAt) todo.createdAt = new Date().toISOString();
                }

                // 기존 데이터와 병합할지 확인
                const shouldMerge = this.todos.length > 0 && 
                    confirm('기존 데이터가 있습니다. 새 데이터와 병합하시겠습니까?\n(취소하면 기존 데이터를 덮어씁니다)');

                if (shouldMerge) {
                    // 중복 제거하여 병합
                    const existingIds = new Set(this.todos.map(todo => todo.id));
                    const newTodos = data.todos.filter(todo => !existingIds.has(todo.id));
                    this.todos = [...this.todos, ...newTodos];
                    this.showNotification(`${newTodos.length}개의 새로운 할 일을 추가했습니다!`, 'success');
                } else {
                    this.todos = data.todos;
                    this.showNotification(`${data.todos.length}개의 할 일을 불러왔습니다!`, 'success');
                }

                // 테마 설정도 가져오기 (선택사항)
                if (data.isDarkMode !== undefined) {
                    this.isDarkMode = data.isDarkMode;
                    document.body.classList.toggle('dark', this.isDarkMode);
                    const themeIcon = document.querySelector('.theme-icon');
                    themeIcon.textContent = this.isDarkMode ? '☀️' : '🌙';
                }

                // 자동 백업 설정도 가져오기 (선택사항)
                if (data.autoBackupEnabled !== undefined) {
                    this.autoBackupEnabled = data.autoBackupEnabled;
                    this.updateAutoBackupUI();
                }

                this.saveToStorage();
                this.updateUI();
                
            } catch (error) {
                console.error('Import error:', error);
                this.showNotification('파일을 읽는 중 오류가 발생했습니다: ' + error.message, 'error');
            }
        };
        
        reader.onerror = () => {
            this.showNotification('파일을 읽을 수 없습니다.', 'error');
        };
        
        reader.readAsText(file, 'UTF-8');
        
        // 파일 입력 초기화
        event.target.value = '';
    }

    // 자동 백업 토글
    toggleAutoBackup() {
        this.autoBackupEnabled = !this.autoBackupEnabled;
        this.updateAutoBackupUI();
        this.saveToStorage();
    }

    // 자동 백업 UI 업데이트
    updateAutoBackupUI() {
        const button = document.getElementById('auto-backup-btn');
        const status = document.getElementById('auto-backup-status');
        
        if (this.autoBackupEnabled) {
            button.classList.add('active');
            status.textContent = 'ON';
            this.showNotification('자동 백업이 활성화되었습니다. 데이터 변경 시 자동으로 다운로드됩니다.', 'success');
        } else {
            button.classList.remove('active');
            status.textContent = 'OFF';
            this.showNotification('자동 백업이 비활성화되었습니다.', 'info');
        }
    }

    // 자동 백업 실행
    performAutoBackup() {
        if (!this.autoBackupEnabled || this.todos.length === 0) return;
        
        try {
            const data = {
                todos: this.todos,
                isDarkMode: this.isDarkMode,
                autoBackupEnabled: this.autoBackupEnabled,
                exportDate: new Date().toISOString(),
                version: '1.0',
                autoBackup: true
            };

            const jsonString = JSON.stringify(data, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
            a.download = `todo-auto-backup-${timestamp}.json`;
            a.style.display = 'none';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Auto backup error:', error);
        }
    }

    // 알림 표시
    showNotification(message, type = 'info') {
        // 기존 알림이 있으면 제거
        const existing = document.querySelector('.notification');
        if (existing) {
            existing.remove();
        }

        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        // 스타일 적용
        Object.assign(notification.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            padding: '12px 20px',
            borderRadius: '8px',
            color: 'white',
            fontSize: '14px',
            fontWeight: '500',
            zIndex: '1000',
            transform: 'translateX(100%)',
            transition: 'transform 0.3s ease',
            backgroundColor: type === 'success' ? '#38a169' : type === 'error' ? '#e53e3e' : '#4a5568',
            maxWidth: '300px',
            wordWrap: 'break-word'
        });

        document.body.appendChild(notification);
        
        // 애니메이션으로 나타나기
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 10);
        
        // 3초 후 자동 제거
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 300);
        }, 3000);
    }

    // 스토리지에 저장
    saveToStorage() {
        const data = {
            todos: this.todos,
            isDarkMode: this.isDarkMode,
            autoBackupEnabled: this.autoBackupEnabled
        };
        // 로컬 스토리지가 지원되지 않는 환경을 위해 메모리에 저장
        this._storageData = data;
    }

    // 로컬 스토리지에서 로드
    loadFromStorage() {
        // 메모리에서 데이터 로드 (브라우저 스토리지 미지원 환경 대응)
        if (this._storageData) {
            this.todos = this._storageData.todos || [];
            this.isDarkMode = this._storageData.isDarkMode || false;
            this.autoBackupEnabled = this._storageData.autoBackupEnabled || false;
        } else {
            this.todos = [];
            this.isDarkMode = false;
            this.autoBackupEnabled = false;
        }
        
        document.body.classList.toggle('dark', this.isDarkMode);
        
        const themeIcon = document.querySelector('.theme-icon');
        if (themeIcon) {
            themeIcon.textContent = this.isDarkMode ? '☀️' : '🌙';
        }
        
        // 자동 백업 상태 업데이트
        setTimeout(() => {
            this.updateAutoBackupUI();
        }, 0);
    }
}

// 애플리케이션 초기화
document.addEventListener('DOMContentLoaded', () => {
    new TodoApp();
});