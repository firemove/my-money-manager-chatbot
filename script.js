// public/script.js

const chatBox = document.getElementById('chat-box');
const inputArea = document.getElementById('input-area');
const userInput = document.getElementById('userInput');
const sendButton = document.getElementById('sendButton');
const welcomeMessageSpan = document.getElementById('welcome-message');
const currentMonthIncomeSpan = document.getElementById('current-month-income');

// --- 데이터 구조 ---
// users: { "사용자이름": { items: ["급여", "용돈"], records: [{ item: "급여", amount: 100000, date: "2025-07-22" }] } }
let users = JSON.parse(localStorage.getItem('moneyManagerUsers')) || {};
let currentUser = null; // 현재 로그인한 사용자 이름

// --- 챗봇 상태 관리 ---
let currentState = 'askUserName'; // 초기 상태
let awaitingInputFor = null; // 어떤 값(항목 이름, 금액, 날짜)을 기다리는지

// --- UI 헬퍼 함수 ---
function addMessage(text, sender = 'chatbot') {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', `${sender}-message`);
    messageDiv.innerHTML = text; // HTML 태그를 포함할 수 있도록 innerHTML 사용
    chatBox.appendChild(messageDiv);
    chatBox.scrollTop = chatBox.scrollHeight; // 스크롤을 항상 아래로
}

function showTextInput(placeholder, currentVal = '') {
    userInput.style.display = 'block';
    sendButton.style.display = 'block';
    userInput.placeholder = placeholder;
    userInput.value = currentVal; // 기존 값 설정 (수정 시 유용)
    userInput.focus();
}

function hideTextInput() {
    userInput.style.display = 'none';
    sendButton.style.display = 'none';
    userInput.value = '';
}

function clearInputAreaButtons() {
    inputArea.innerHTML = '';
}

function addButton(text, onClickHandler, className = '') {
    const button = document.createElement('button');
    button.classList.add('dynamic-button');
    if (className) button.classList.add(className);
    button.textContent = text;
    button.onclick = onClickHandler;
    inputArea.appendChild(button);
}

function showLoading(message = '처리 중...') {
    clearInputAreaButtons();
    hideTextInput();
    addMessage(message, 'chatbot');
    // 실제 로딩 스피너 등을 추가할 수 있습니다.
}

// --- 데이터 관리 함수 ---
function saveUsersData() {
    localStorage.setItem('moneyManagerUsers', JSON.stringify(users));
    updateTopBar(); // 데이터 저장 후 상단바 업데이트
}

function getCurrentUser() {
    return users[currentUser];
}

// 월별 수입액 계산 및 상단바 업데이트
function updateTopBar() {
    if (currentUser && users[currentUser]) {
        welcomeMessageSpan.textContent = `안녕하세요, ${currentUser}님!`;

        const today = new Date();
        const currentYear = today.getFullYear();
        const currentMonth = today.getMonth(); // 0-11

        const totalIncomeThisMonth = calculateMonthlyIncome(currentYear, currentMonth);
        currentMonthIncomeSpan.textContent = `이번 달 수입: ${totalIncomeThisMonth.toLocaleString()}원`;
    } else {
        welcomeMessageSpan.textContent = '안녕하세요!';
        currentMonthIncomeSpan.textContent = '';
    }
}

// 특정 월의 총 수입을 계산하는 함수
function calculateMonthlyIncome(year, month) {
    let total = 0;
    if (currentUser && users[currentUser]) {
        users[currentUser].records.forEach(record => {
            const recordDate = new Date(record.date);
            if (recordDate.getFullYear() === year && recordDate.getMonth() === month) {
                total += record.amount;
            }
        });
    }
    return total;
}

// --- 챗봇 로직 ---

// 초기 시작
function startChat() {
    addMessage('안녕하세요! 당신의 이름이 무엇인가요? (예: "김철수")');
    showTextInput('이름을 입력하세요.');
    awaitingInputFor = 'userName';
}

// 사용자 이름 설정
function setUserName(name) {
    if (!name.trim()) {
        addMessage('이름을 정확히 입력해주세요.');
        return;
    }
    currentUser = name.trim();
    if (!users[currentUser]) {
        users[currentUser] = {
            items: [],
            records: []
        };
        addMessage(`환영합니다, ${currentUser}님! 새로운 사용자이시군요.`, 'chatbot');
    } else {
        addMessage(`다시 오신 것을 환영합니다, ${currentUser}님!`, 'chatbot');
    }
    saveUsersData();
    updateTopBar();
    showMainMenu();
}

// 메인 메뉴 표시
function showMainMenu() {
    clearInputAreaButtons();
    hideTextInput();
    awaitingInputFor = null;

    addMessage('무엇을 도와드릴까요?');
    addButton('수입 기록하기', () => showAddIncomeFlow(), 'primary');
    addButton('수입 항목 관리', () => showManageItemsMenu());
    addButton('다른 사용자 전환', () => {
        addMessage('다른 사용자로 전환합니다. 이름을 입력해주세요.');
        showTextInput('이름을 입력하세요.');
        awaitingInputFor = 'userName';
        currentUser = null; // 현재 사용자 초기화
        updateTopBar();
    });
}

// 수입 기록 흐름 시작
function showAddIncomeFlow() {
    clearInputAreaButtons();
    hideTextInput();

    const user = getCurrentUser();
    if (user.items.length === 0) {
        addMessage('아직 등록된 수입 항목이 없습니다. 먼저 수입 항목을 등록해주세요.');
        addButton('수입 항목 관리', () => showManageItemsMenu(), 'primary');
        return;
    }

    addMessage('어떤 항목으로 수입을 기록할까요?');
    user.items.forEach(item => {
        addButton(item, () => selectIncomeItem(item));
    });
    addButton('메인 메뉴로', () => showMainMenu());
}

// 수입 항목 선택 후 금액 입력 대기
function selectIncomeItem(item) {
    addMessage(`"${item}" 항목을 선택했습니다. 금액을 입력해주세요. (예: 50000)`, 'user');
    awaitingInputFor = { type: 'incomeAmount', item: item, date: new Date().toISOString().slice(0, 10) }; // 기본 날짜는 오늘
    showTextInput('금액 입력 (숫자만)');
}

// 금액 입력 후 날짜 수정 옵션 제시
function setIncomeAmount(amountStr) {
    const amount = parseInt(amountStr);
    if (isNaN(amount) || amount <= 0) {
        addMessage('유효한 금액(양수)을 숫자로 입력해주세요.');
        showTextInput('금액 입력 (숫자만)', amountStr);
        return;
    }

    const { item, date } = awaitingInputFor;
    const today = new Date().toISOString().slice(0, 10);

    // 사용자에게 입력된 금액과 기본 날짜를 보여주고, 날짜 수정 여부 묻기
    addMessage(`${amount.toLocaleString()}원을 "${item}" 항목으로 기록합니다. 날짜는 ${date}입니다.`);
    clearInputAreaButtons();
    addMessage(`날짜를 수정하시겠습니까?`);
    addButton('네, 수정하겠습니다', () => showDateInputForRecord(item, amount, date), 'primary');
    addButton('아니요, 이대로 기록합니다', () => finalizeIncomeRecord(item, amount, date));
    awaitingInputFor = null; // 대기 상태 초기화
}

// 날짜 입력 받기
function showDateInputForRecord(item, amount, currentDate) {
    clearInputAreaButtons();
    hideTextInput();
    addMessage(`날짜를 선택하거나 직접 입력해주세요 (YYYY-MM-DD 형식). 현재: ${currentDate}`);

    const dateInput = document.createElement('input');
    dateInput.type = 'date';
    dateInput.id = 'datePicker';
    dateInput.value = currentDate;
    inputArea.appendChild(dateInput);

    const confirmButton = document.createElement('button');
    confirmButton.textContent = '날짜 확정';
    confirmButton.classList.add('dynamic-button', 'primary');
    confirmButton.onclick = () => {
        const newDate = dateInput.value;
        if (!/^\d{4}-\d{2}-\d{2}$/.test(newDate)) {
            addMessage('날짜 형식이 올바르지 않습니다 (YYYY-MM-DD). 다시 선택하거나 입력해주세요.');
            return;
        }
        finalizeIncomeRecord(item, amount, newDate);
    };
    inputArea.appendChild(confirmButton);
}

// 최종 수입 기록 확정 및 월별 합산 안내
function finalizeIncomeRecord(item, amount, date) {
    const user = getCurrentUser();
    user.records.push({ item: item, amount: amount, date: date });
    saveUsersData();

    addMessage(`✅ ${date}에 "${item}" 항목으로 ${amount.toLocaleString()}원 수입이 기록되었습니다!`, 'chatbot');

    const recordDate = new Date(date);
    const currentYear = recordDate.getFullYear();
    const currentMonth = recordDate.getMonth(); // 0-11

    const totalIncomeThisMonth = calculateMonthlyIncome(currentYear, currentMonth);
    // 월별 누적 합산 메시지 추가
    addMessage(`이번 달(${currentYear}년 ${currentMonth + 1}월) 총 수입은 **${totalIncomeThisMonth.toLocaleString()}원** 입니다.`, 'chatbot');

    showMainMenu();
}


// 수입 항목 관리 메뉴
function showManageItemsMenu() {
    clearInputAreaButtons();
    hideTextInput();
    awaitingInputFor = null;

    addMessage('수입 항목 관리 메뉴입니다.');
    const user = getCurrentUser();

    if (user.items.length > 0) {
        addMessage('현재 등록된 항목: ' + user.items.join(', '));
        addButton('항목 추가', () => {
            addMessage('추가할 수입 항목 이름을 입력하세요. (예: "부수입")', 'chatbot');
            showTextInput('항목 이름');
            awaitingInputFor = 'addItem';
        }, 'primary');
        addButton('항목 삭제', () => showRemoveItemFlow());
    } else {
        addMessage('아직 등록된 수입 항목이 없습니다.');
        addButton('첫 수입 항목 추가', () => {
            addMessage('추가할 수입 항목 이름을 입력하세요. (예: "급여")', 'chatbot');
            showTextInput('항목 이름');
            awaitingInputFor = 'addItem';
        }, 'primary');
    }
    addButton('메인 메뉴로', () => showMainMenu());
}

// 항목 추가 처리
function addItem(itemName) {
    const user = getCurrentUser();
    const trimmedItemName = itemName.trim();
    if (!trimmedItemName) {
        addMessage('항목 이름을 정확히 입력해주세요.');
        showTextInput('항목 이름', itemName);
        return;
    }
    if (user.items.includes(trimmedItemName)) {
        addMessage('이미 존재하는 항목입니다.');
    } else {
        user.items.push(trimmedItemName);
        addMessage(`"${trimmedItemName}" 항목이 추가되었습니다!`, 'chatbot');
    }
    saveUsersData();
    showManageItemsMenu();
}

// 항목 삭제 흐름 시작
function showRemoveItemFlow() {
    clearInputAreaButtons();
    hideTextInput();

    const user = getCurrentUser();
    if (user.items.length === 0) {
        addMessage('삭제할 수입 항목이 없습니다.');
        showManageItemsMenu();
        return;
    }

    addMessage('어떤 항목을 삭제할까요?');
    user.items.forEach(item => {
        addButton(item, () => confirmRemoveItem(item), 'danger');
    });
    addButton('취소', () => showManageItemsMenu());
}

// 항목 삭제 확인
function confirmRemoveItem(item) {
    addMessage(`정말 "${item}" 항목을 삭제하시겠습니까? 이 항목과 관련된 모든 기록은 유지됩니다.`, 'chatbot');
    clearInputAreaButtons();
    addButton('예, 삭제합니다', () => removeItem(item), 'danger');
    addButton('아니요, 취소합니다', () => showManageItemsMenu());
}

// 항목 삭제 처리
function removeItem(itemName) {
    const user = getCurrentUser();
    user.items = user.items.filter(item => item !== itemName);
    saveUsersData();
    addMessage(`"${itemName}" 항목이 삭제되었습니다.`, 'chatbot');
    showManageItemsMenu();
}

// --- 이벤트 리스너 ---
sendButton.addEventListener('click', () => {
    const inputText = userInput.value.trim();
    if (!inputText) return;

    addMessage(inputText, 'user');
    userInput.value = ''; // 입력 필드 초기화

    if (awaitingInputFor === 'userName') {
        setUserName(inputText);
    } else if (awaitingInputFor && awaitingInputFor.type === 'incomeAmount') {
        setIncomeAmount(inputText);
    } else if (awaitingInputFor === 'addItem') {
        addItem(inputText);
    }
    // 그 외의 텍스트 입력은 현재 없음
});

// 엔터 키로 전송 (텍스트 입력 필드가 활성화되었을 때)
userInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendButton.click();
    }
});

// --- 초기화 ---
// 페이지 로드 시 사용자 데이터 확인 및 챗봇 시작
// 현재 날짜를 기반으로 초기 월별 수입액을 계산합니다.
const today = new Date();
const currentYear = today.getFullYear();
const currentMonth = today.getMonth(); // 0-11

if (currentUser === null) { // 초기 로드 시 `currentUser`는 null
    const storedUsers = JSON.parse(localStorage.getItem('moneyManagerUsers'));
    if (Object.keys(storedUsers || {}).length > 0) {
        addMessage('안녕하세요! 어떤 사용자이신가요? 등록된 사용자: ' + Object.keys(storedUsers).join(', ') + ' 또는 새로운 이름 입력');
        showTextInput('이름을 입력하세요.');
        awaitingInputFor = 'userName';
    } else {
        startChat(); // 저장된 사용자 없으면 바로 이름 질문
    }
} else {
    // 페이지 새로고침 시 기존 사용자 유지 (localstorage에서 이미 불러왔으므로)
    updateTopBar();
    addMessage(`어서오세요, ${currentUser}님!`);
    showMainMenu();
}
updateTopBar(); // 초기 로드 시에도 상단바 업데이트