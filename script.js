const STORAGE_KEY = 'historicoHorasExtrasV2';
const OLD_STORAGE_KEY = 'historicoHorasExtras';

const state = {
  selectedTab: 'saida',
  calendarDate: new Date(),
  selectedDate: null,
  history: {}
};

document.addEventListener('DOMContentLoaded', () => {
  state.history = loadHistory();

  bindNavigation();
  bindSaidaForm();
  bindExtrasForm();
  bindRegistroForm();
  renderCalendar();
  renderMonthTotal();
});

function bindNavigation() {
  const menuToggle = document.querySelector('.menu-toggle');
  const menu = document.querySelector('.menu');

  menuToggle.addEventListener('click', () => {
    const isOpen = menu.classList.toggle('active');
    menuToggle.setAttribute('aria-expanded', String(isOpen));
  });

  document.querySelectorAll('[data-tab]').forEach((button) => {
    button.addEventListener('click', () => {
      showTab(button.dataset.tab);
      menu.classList.remove('active');
      menuToggle.setAttribute('aria-expanded', 'false');
    });
  });
}

function showTab(tabName) {
  state.selectedTab = tabName;

  document.querySelectorAll('[data-panel]').forEach((panel) => {
    const isActive = panel.dataset.panel === tabName;
    panel.hidden = !isActive;
    panel.classList.toggle('active', isActive);
  });

  document.querySelectorAll('[data-tab]').forEach((button) => {
    button.classList.toggle('active', button.dataset.tab === tabName);
  });

  if (tabName === 'registro') {
    renderCalendar();
    renderSelectedDate();
    renderMonthTotal();
  }
}

function bindSaidaForm() {
  document.getElementById('saida-form').addEventListener('submit', (event) => {
    event.preventDefault();

    const entrada = document.getElementById('entrada').value;
    const horasTrabalho = readNumber('horasTrabalho');
    const minutosAlmoco = readNumber('minutosAlmoco');
    const resultado = document.getElementById('saidaResultado');

    if (!entrada || !isValidNumber(horasTrabalho) || !isValidNumber(minutosAlmoco)) {
      resultado.textContent = 'Preencha todos os campos com valores válidos.';
      return;
    }

    const resultadoSaida = calculateExitTime(entrada, horasTrabalho, minutosAlmoco);

    resultado.innerHTML = `
      <span>Você deve sair às</span>
      <strong>${resultadoSaida.clock}</strong>
      ${resultadoSaida.nextDay ? '<small>no dia seguinte</small>' : ''}
    `;
  });
}

function bindExtrasForm() {
  document.getElementById('extras-form').addEventListener('submit', (event) => {
    event.preventDefault();

    const salarioMensal = readNumber('salarioMensal');
    const divisorMensal = readNumber('divisorMensal');
    const adicionalExtra = readNumber('adicionalExtra');
    const horasExtrasMes = readNumber('horasExtrasMes');
    const resultado = document.getElementById('extrasResultado');

    if (
      !isValidNumber(salarioMensal) ||
      !isValidNumber(divisorMensal) ||
      !isValidNumber(adicionalExtra) ||
      !isValidNumber(horasExtrasMes) ||
      divisorMensal <= 0
    ) {
      resultado.textContent = 'Preencha todos os campos com valores válidos.';
      return;
    }

    const resultadoExtras = calculateOvertime(
      salarioMensal,
      divisorMensal,
      adicionalExtra,
      horasExtrasMes
    );

    resultado.innerHTML = `
      <span>Valor da hora extra</span>
      <strong>${formatCurrency(resultadoExtras.overtimeRate)}</strong>
      <small>Total estimado: ${formatCurrency(resultadoExtras.total)}</small>
    `;
  });
}

function calculateExitTime(entrada, horasTrabalho, minutosAlmoco) {
  const [horas, minutos] = entrada.split(':').map(Number);
  const totalMinutos = horas * 60 + minutos + horasTrabalho * 60 + minutosAlmoco;
  const saidaMinutos = normalizeMinutes(totalMinutos);

  return {
    clock: formatClock(saidaMinutos),
    nextDay: totalMinutos >= 24 * 60
  };
}

function calculateOvertime(salarioMensal, divisorMensal, adicionalExtra, horasExtrasMes) {
  const valorHora = salarioMensal / divisorMensal;
  const multiplicadorExtra = 1 + adicionalExtra / 100;
  const overtimeRate = valorHora * multiplicadorExtra;

  return {
    overtimeRate,
    total: horasExtrasMes * overtimeRate
  };
}

function bindRegistroForm() {
  document.getElementById('registro-form').addEventListener('submit', (event) => {
    event.preventDefault();

    if (!state.selectedDate) {
      setRegistroMessage('Selecione uma data no calendário.');
      return;
    }

    const horasExtras = readNumber('horasExtras');

    if (!isValidNumber(horasExtras)) {
      setRegistroMessage('Informe uma quantidade válida de horas.');
      return;
    }

    state.history[state.selectedDate] = horasExtras;
    saveHistory();
    renderCalendar();
    renderSelectedDate();
    renderMonthTotal();
  });

  document.getElementById('excluirDia').addEventListener('click', () => {
    if (!state.selectedDate) {
      setRegistroMessage('Selecione uma data para excluir.');
      return;
    }

    delete state.history[state.selectedDate];
    document.getElementById('horasExtras').value = '';
    saveHistory();
    renderCalendar();
    renderSelectedDate();
    renderMonthTotal();
  });

  document.getElementById('limparHistorico').addEventListener('click', () => {
    const monthPrefix = getMonthPrefix(state.calendarDate);

    Object.keys(state.history).forEach((dateKey) => {
      if (dateKey.startsWith(monthPrefix)) {
        delete state.history[dateKey];
      }
    });

    document.getElementById('horasExtras').value = '';
    saveHistory();
    renderCalendar();
    renderSelectedDate();
    renderMonthTotal();
  });

  document.getElementById('mesAnterior').addEventListener('click', () => {
    state.calendarDate.setMonth(state.calendarDate.getMonth() - 1);
    state.selectedDate = null;
    document.getElementById('horasExtras').value = '';
    renderCalendar();
    renderSelectedDate();
    renderMonthTotal();
  });

  document.getElementById('proximoMes').addEventListener('click', () => {
    state.calendarDate.setMonth(state.calendarDate.getMonth() + 1);
    state.selectedDate = null;
    document.getElementById('horasExtras').value = '';
    renderCalendar();
    renderSelectedDate();
    renderMonthTotal();
  });
}

function renderCalendar() {
  const body = document.getElementById('corpoCalendario');
  const monthLabel = document.getElementById('mesAtual');
  const year = state.calendarDate.getFullYear();
  const month = state.calendarDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const totalDays = lastDay.getDate();

  body.innerHTML = '';
  monthLabel.textContent = state.calendarDate.toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric'
  });

  let day = 1;

  for (let rowIndex = 0; rowIndex < 6; rowIndex++) {
    const row = document.createElement('tr');

    for (let columnIndex = 0; columnIndex < 7; columnIndex++) {
      const cell = document.createElement('td');

      if ((rowIndex === 0 && columnIndex < firstDay.getDay()) || day > totalDays) {
        cell.className = 'empty-day';
        row.appendChild(cell);
        continue;
      }

      const dateKey = toDateKey(year, month, day);
      const hours = state.history[dateKey];
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'day-button';
      button.dataset.date = dateKey;
      button.innerHTML = `
        <span>${day}</span>
        ${isValidNumber(hours) ? `<small>${formatHours(hours)}</small>` : ''}
      `;

      button.classList.toggle('has-entry', isValidNumber(hours));
      button.classList.toggle('selected', state.selectedDate === dateKey);
      button.addEventListener('click', () => selectDate(dateKey));

      cell.appendChild(button);
      row.appendChild(cell);
      day += 1;
    }

    body.appendChild(row);

    if (day > totalDays) {
      break;
    }
  }
}

function selectDate(dateKey) {
  state.selectedDate = dateKey;
  const hours = state.history[dateKey];

  document.getElementById('horasExtras').value = isValidNumber(hours) ? hours : '';
  renderCalendar();
  renderSelectedDate();
}

function renderSelectedDate() {
  const selectedDate = document.getElementById('dataSelecionada');

  if (!state.selectedDate) {
    selectedDate.textContent = 'Selecione uma data.';
    setRegistroMessage('Nenhum dia selecionado.');
    return;
  }

  const hours = state.history[state.selectedDate];
  selectedDate.textContent = formatDateLabel(state.selectedDate);
  setRegistroMessage(
    isValidNumber(hours)
      ? `${formatDateLabel(state.selectedDate)}: ${formatHours(hours)} registradas.`
      : `${formatDateLabel(state.selectedDate)} sem registro.`
  );
}

function renderMonthTotal() {
  const monthPrefix = getMonthPrefix(state.calendarDate);
  const total = Object.entries(state.history)
    .filter(([dateKey]) => dateKey.startsWith(monthPrefix))
    .reduce((sum, [, hours]) => sum + Number(hours), 0);

  document.getElementById('totalMes').innerHTML = `
    <span>Total do mês</span>
    <strong>${formatHours(total)}</strong>
  `;
}

function setRegistroMessage(message) {
  document.getElementById('resultadoRegistro').textContent = message;
}

function loadHistory() {
  const current = parseStorage(STORAGE_KEY);

  if (current) {
    return current;
  }

  const oldHistory = parseStorage(OLD_STORAGE_KEY);

  if (Array.isArray(oldHistory)) {
    return oldHistory.reduce((acc, item) => {
      if (item.data && isValidNumber(Number(item.horasExtras))) {
        acc[normalizeDateKey(item.data)] = Number(item.horasExtras);
      }

      return acc;
    }, {});
  }

  return {};
}

function parseStorage(key) {
  try {
    return JSON.parse(localStorage.getItem(key));
  } catch {
    return null;
  }
}

function saveHistory() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.history));
}

function readNumber(id) {
  return Number(String(document.getElementById(id).value).replace(',', '.'));
}

function isValidNumber(value) {
  return Number.isFinite(value) && value >= 0;
}

function normalizeMinutes(minutes) {
  return ((minutes % (24 * 60)) + 24 * 60) % (24 * 60);
}

function formatClock(totalMinutes) {
  const roundedMinutes = Math.round(totalMinutes);
  const hours = Math.floor(roundedMinutes / 60);
  const minutes = roundedMinutes % 60;

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function formatCurrency(value) {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });
}

function formatHours(value) {
  return `${Number(value).toLocaleString('pt-BR', {
    maximumFractionDigits: 2
  })}h`;
}

function formatDateLabel(dateKey) {
  const [year, month, day] = dateKey.split('-').map(Number);
  const date = new Date(year, month - 1, day);

  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

function toDateKey(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function normalizeDateKey(dateKey) {
  const [year, month, day] = dateKey.split('-').map(Number);
  return toDateKey(year, month - 1, day);
}

function getMonthPrefix(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}
