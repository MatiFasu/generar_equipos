document.addEventListener('DOMContentLoaded', () => {
    const playerInputContainer = document.getElementById('playerInputContainer');
    const balanceBtn = document.getElementById('balanceBtn');
    const prepareBtn = document.getElementById('prepareBtn');
    const generateTxtBtn = document.getElementById('generateTxtBtn');
    const teamAList = document.getElementById('teamAList');
    const teamBList = document.getElementById('teamBList');
    const totalA = document.getElementById('totalA');
    const totalB = document.getElementById('totalB');
    const statusMessage = document.getElementById('statusMessage');

    // --- 1. PREPARACIÓN DE TABLA ---
    prepareBtn.addEventListener('click', () => {
        const text = document.getElementById('playerInput').value;
        const names = text.trim().split('\n')
            .map(n => n.replace(/^\d+\.\s*/, '').trim()) // Limpia números de WhatsApp
            .filter(n => n);

        if (names.length < 2) return alert("Pega al menos 2 nombres");

        playerInputContainer.innerHTML = `
            <table id="levelTable">
                <thead><tr><th>Jugador</th><th>Calidad (1-10)</th><th>🧤 Arquero</th></tr></thead>
                <tbody></tbody>
            </table>`;
        const tbody = playerInputContainer.querySelector('tbody');

        names.forEach(name => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${name}</td>
                <td><input type="number" class="l-in" value="5" min="1" max="10"></td>
                <td><input type="checkbox" class="gk-in"></td>`;
            tbody.appendChild(tr);
            
            const check = tr.querySelector('.gk-in');
            const input = tr.querySelector('.l-in');
            check.addEventListener('change', () => {
                if (document.querySelectorAll('.gk-in:checked').length > 2) {
                    check.checked = false; 
                    return alert("Máximo 2 arqueros");
                }
                input.disabled = check.checked;
                if (check.checked) { input.dataset.old = input.value; input.value = 0; }
                else { input.value = input.dataset.old || 5; }
            });
        });
        prepareBtn.style.display = 'none';
        balanceBtn.style.display = 'block';
    });

    // --- 2. GENERACIÓN AUTOMÁTICA ---
    balanceBtn.addEventListener('click', () => {
        const rows = document.querySelectorAll('#levelTable tbody tr');
        const players = Array.from(rows).map(row => ({
            name: row.cells[0].innerText,
            level: parseFloat(row.querySelector('.l-in').value),
            isGK: row.querySelector('.gk-in').checked
        }));

        // Clasificar
        const campo = players.filter(p => !p.isGK).sort((a,b) => b.level - a.level);
        const arqs = players.filter(p => p.isGK);

        let tA = [], tB = [];
        let sA = 0, sB = 0;

        // Valor arquero dinámico (Promedio de los 2 mejores de campo)
        const valArq = campo.length >= 2 ? (campo[0].level + campo[1].level) / 2 : 5;

        // Repartir arqueros
        arqs.forEach((g, i) => {
            if (i % 2 === 0) { tA.push(g); sA += valArq; } 
            else { tB.push(g); sB += valArq; }
        });

        // Repartir campo manteniendo balance numérico
        const limit = Math.ceil(players.length / 2);
        campo.forEach(p => {
            if (tA.length >= limit) { tB.push(p); sB += p.level; }
            else if (tB.length >= limit) { tA.push(p); sA += p.level; }
            else {
                // Compensación si un equipo tiene arquero y el otro no
                const gkA = tA.filter(x => x.isGK).length;
                const gkB = tB.filter(x => x.isGK).length;
                let bonusA = (gkA > gkB) ? valArq : 0;
                let bonusB = (gkB > gkA) ? valArq : 0;

                if ((sA + bonusA) <= (sB + bonusB)) { tA.push(p); sA += p.level; }
                else { tB.push(p); sB += p.level; }
            }
        });

        renderTeams(tA, tB);
        generateTxtBtn.style.display = 'block';
    });

    // --- 3. DRAG & DROP Y CÁLCULOS ---
    function renderTeams(listA, listB) {
        renderList(teamAList, listA);
        renderList(teamBList, listB);
        updateTotals();
    }

    function renderList(el, players) {
        el.innerHTML = '';
        players.forEach(p => {
            const li = document.createElement('li');
            li.className = `player-bar ${p.isGK ? 'is-gk' : ''}`;
            li.draggable = true;
            li.dataset.name = p.name;
            li.dataset.level = p.isGK ? 'GK' : p.level;
            li.innerHTML = `<span>${p.isGK ? '🧤 ' : ''}${p.name}</span> <b>${p.isGK ? 'Arq' : p.level}</b>`;
            
            li.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', p.name);
                setTimeout(() => li.style.display = 'none', 0);
            });
            li.addEventListener('dragend', () => li.style.display = 'flex');
            el.appendChild(li);
        });
    }

    function updateTotals() {
        const allBars = Array.from(document.querySelectorAll('.player-bar'));
        const campoLevels = allBars.filter(li => li.dataset.level !== 'GK')
                                  .map(li => parseFloat(li.dataset.level))
                                  .sort((a,b) => b-a);
        
        // Recalcula valor arquero basado en las barras actuales
        const valArq = campoLevels.length >= 2 ? (campoLevels[0] + campoLevels[1]) / 2 : 5;

        const calc = (listId) => {
            return Array.from(document.querySelectorAll(`#${listId} .player-bar`)).reduce((acc, li) => {
                const val = (li.dataset.level === 'GK') ? valArq : parseFloat(li.dataset.level);
                return acc + val;
            }, 0);
        };

        totalA.innerText = calc('teamAList').toFixed(1);
        totalB.innerText = calc('teamBList').toFixed(1);
        statusMessage.innerText = `Valor Arquero actual: ${valArq.toFixed(1)}`;
    }

    // Zonas de Drop
    [teamAList, teamBList].forEach(zone => {
        zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('drag-over'); });
        zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
        zone.addEventListener('drop', (e) => {
            e.preventDefault();
            zone.classList.remove('drag-over');
            const name = e.dataTransfer.getData('text/plain');
            const draggedEl = document.querySelector(`[data-name="${name}"]`);
            zone.appendChild(draggedEl);
            updateTotals();
        });
    });

    // --- 4. COPIAR TXT ---
    generateTxtBtn.addEventListener('click', () => {
        const getNames = (id) => Array.from(document.querySelectorAll(`#${id} .player-bar`))
            .map((li, i) => `${i + 1}. ${li.dataset.name}`).join('\n');
        
        const msg = `Equipo A\n-----------\n${getNames('teamAList')}\n\nEquipo B\n-----------\n${getNames('teamBList')}`;
        navigator.clipboard.writeText(msg).then(() => alert("✅ Copiado al portapapeles"));
    });
});