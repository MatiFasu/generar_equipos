document.addEventListener('DOMContentLoaded', () => {
    // --------------------------------------------------------------------------
    // 1. REFERENCIAS A ELEMENTOS DEL DOM
    // --------------------------------------------------------------------------
    const playerInputContainer = document.getElementById('playerInputContainer');
    const balanceBtn = document.getElementById('balanceBtn');
    const prepareBtn = document.getElementById('prepareBtn'); 
    const generateTxtBtn = document.getElementById('generateTxtBtn'); 
    const teamAList = document.getElementById('teamAList');
    const teamBList = document.getElementById('teamBList');
    const totalA = document.getElementById('totalA');
    const totalB = document.getElementById('totalB');
    const statusMessage = document.getElementById('statusMessage');
    
    // --------------------------------------------------------------------------
    // 2. FUNCIONES DE INTERFAZ Y UTILIDAD
    // --------------------------------------------------------------------------
    
    // Transforma texto plano (una línea por nombre) a una lista de nombres.
    function parseNames(text) {
        return text.trim().split('\n')
                   .map(line => line.trim())
                   .filter(line => line.length > 0);
    }
    
    // Crea la tabla dinámica para asignar niveles (reemplaza el textarea).
    function buildLevelTable(names) {
        if (names.length === 0) return;

        // Ocultar el textarea y mostrar la tabla
        playerInputContainer.innerHTML = '';
        const table = document.createElement('table');
        table.id = 'levelTable';
        table.innerHTML = `
            <thead>
                <tr>
                    <th>Jugador</th>
                    <th>Nivel (1-10)</th>
                </tr>
            </thead>
            <tbody></tbody>
        `;
        const tbody = table.querySelector('tbody');

        // Limpiar nombres de cualquier numeración de WhatsApp (ej: "1. Juan")
        const cleanedNames = names.map(name => 
            name.replace(/^\d+\.\s*/, '').trim()
        );

        cleanedNames.forEach(name => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${name}</td>
                <td>
                    <input type="number" 
                           class="level-input" 
                           data-name="${name}" 
                           min="1" max="10" 
                           value="5"> 
                </td>
            `;
            tbody.appendChild(tr);
        });

        playerInputContainer.appendChild(table);

        // Mostrar botones de acción y ocultar el de preparación
        prepareBtn.style.display = 'none';
        balanceBtn.style.display = 'block';
        generateTxtBtn.style.display = 'none'; 
    }

    // Lee los datos de la tabla (Jugador y Nivel) y los convierte en objetos.
    function readPlayersFromTable() {
        const players = [];
        const levelInputs = document.querySelectorAll('#levelTable .level-input');
        
        levelInputs.forEach(input => {
            const name = input.getAttribute('data-name');
            const level = parseInt(input.value, 10);

            if (name && !isNaN(level) && level >= 1 && level <= 10) {
                players.push({ name, level });
            } else {
                console.error(`Nivel inválido para ${name}. Se espera 1-10.`);
            }
        });
        return players;
    }
    
    // Muestra los equipos generados en la sección de resultados.
    function displayTeams(teamA, totalSumA, teamB, totalSumB) {
        teamAList.innerHTML = '';
        teamBList.innerHTML = '';
        
        generateTxtBtn.style.display = 'none'; // Ocultar el botón de copia antes de rellenar

        // Equipo A
        teamA.forEach(player => {
            const li = document.createElement('li');
            li.innerHTML = `<span>${player.name}</span> <span>(Nivel: ${player.level})</span>`;
            teamAList.appendChild(li);
        });
        totalA.textContent = totalSumA;

        // Equipo B
        teamB.forEach(player => {
            const li = document.createElement('li');
            li.innerHTML = `<span>${player.name}</span> <span>(Nivel: ${player.level})</span>`;
            teamBList.appendChild(li);
        });
        totalB.textContent = totalSumB;
        
        // Mostrar el botón de generar TXT
        generateTxtBtn.style.display = 'block';

        const difference = Math.abs(totalSumA - totalSumB);
        statusMessage.textContent = `¡Equipos generados! Diferencia de nivel total: ${difference}`;
        statusMessage.style.color = (difference <= 1) ? 'green' : 'orange';
    }
    
    // Función para copiar texto al portapapeles (utiliza la API moderna)
    function copyToClipboard(text) {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(text).then(() => {
                alert("✅ ¡Texto de equipos copiado al portapapeles! Listo para pegar en WhatsApp.");
            }).catch(err => {
                console.error('Error al copiar:', err);
                alert("❌ Error al intentar copiar. Por favor, revisa la consola.");
            });
        } else {
            // Fallback
            const textarea = document.createElement('textarea');
            textarea.value = text;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            alert("✅ ¡Texto de equipos copiado al portapapeles! Listo para pegar en WhatsApp.");
        }
    }


    // --------------------------------------------------------------------------
    // 3. ALGORITMO GREEDY (DIVISIÓN POR CALIDAD)
    // --------------------------------------------------------------------------
    function balanceTeamsByQuality(players) {
        // 1. Ordenar de mayor a menor nivel (Calidad)
        const sortedPlayers = players.sort((a, b) => b.level - a.level);
        
        // 2. Inicializar equipos y sumas
        let teamA = [];
        let teamB = [];
        let sumA = 0;
        let sumB = 0;

        // 3. Asignación greedy
        for (const player of sortedPlayers) {
            // Asignar al equipo con menor suma de nivel hasta el momento
            if (sumA <= sumB) {
                teamA.push(player);
                sumA += player.level;
            } else {
                teamB.push(player);
                sumB += player.level;
            }
        }
        
        return { teamA, sumA, teamB, sumB };
    }
    
    // --------------------------------------------------------------------------
    // 4. MANEJO DE EVENTOS
    // --------------------------------------------------------------------------

    // 4.1. Botón "Preparar Niveles" (Primer Paso)
    prepareBtn.addEventListener('click', () => {
        const textarea = document.getElementById('playerInput');
        if (!textarea) return; 

        const inputData = textarea.value;
        const names = parseNames(inputData);

        if (names.length < 2) {
            statusMessage.textContent = "Necesitas al menos 2 nombres de jugadores para continuar.";
            statusMessage.style.color = 'red';
            return;
        }

        buildLevelTable(names);
        statusMessage.textContent = "Paso 2: Asigna un nivel (1-10) a cada jugador y pulsa Generar Equipos.";
        statusMessage.style.color = 'blue';
    });

    // 4.2. Botón "Generar Equipos" (Segundo Paso)
    balanceBtn.addEventListener('click', () => {
        const currentPlayers = readPlayersFromTable();
        
        if (currentPlayers.length < 2) {
            statusMessage.textContent = "No hay jugadores válidos en la tabla. Revisa los niveles (1-10).";
            statusMessage.style.color = 'red';
            return;
        }

        const { teamA, sumA, teamB, sumB } = balanceTeamsByQuality(currentPlayers);
        
        displayTeams(teamA, sumA, teamB, sumB);
    });
    
    // 4.3. Botón "Generar TXT para WhatsApp"
    generateTxtBtn.addEventListener('click', () => {
        if (teamAList.children.length === 0) {
            alert("Primero genera los equipos.");
            return;
        }

        // Obtener los nombres directamente de las listas (sin nivel)
        const teamANames = Array.from(teamAList.children).map(li => 
            li.querySelector('span:first-child').textContent.trim()
        );
        const teamBNames = Array.from(teamBList.children).map(li => 
            li.querySelector('span:first-child').textContent.trim()
        );
        
        // Función para limpiar el nombre y luego numerar la lista de jugadores
        const formatList = (names) => {
            // 1. Limpiar: Elimina números seguidos de punto al inicio (ej: "1. ro gaunass" -> "ro gaunass")
            const cleanedNames = names.map(name => 
                name.replace(/^\d+\.\s*/, '').trim()
            );

            // 2. Numerar: Creamos la nueva lista numerada (1., 2., 3. ...)
            return cleanedNames.map((name, index) => `${index + 1}. ${name}`).join('\n');
        };

        // Construir el mensaje MÍNIMO para WhatsApp (formato solicitado)
        const whatsappMessage = 
            `Equipo A\n` +
            `---------------------------\n` +
            formatList(teamANames) +
            `\n\n` +
            `Equipo B\n` +
            `---------------------------\n` +
            formatList(teamBNames);

        copyToClipboard(whatsappMessage);
    });

});