document.addEventListener('DOMContentLoaded', () => {

    // --- Matter.js Aliases ---
    const Engine = Matter.Engine,
          Render = Matter.Render,
          Runner = Matter.Runner,
          World = Matter.World,
          Bodies = Matter.Bodies,
          Events = Matter.Events;

    // --- Color Interpolation Helper (Unchanged) ---
    function lerpColor(a, b, amount) {
        const ar = parseInt(a.slice(1, 3), 16), ag = parseInt(a.slice(3, 5), 16), ab = parseInt(a.slice(5, 7), 16),
              br = parseInt(b.slice(1, 3), 16), bg = parseInt(b.slice(3, 5), 16), bb = parseInt(b.slice(5, 7), 16),
              rr = Math.round(ar + (br - ar) * amount), gg = Math.round(ag + (bg - ag) * amount),
              bb_val = Math.round(ab + (bb - ab) * amount);
        return '#' + ((1 << 24) + (rr << 16) + (gg << 8) + bb_val).toString(16).slice(1).padStart(6, '0');
    }

    // --- Game Configuration (Unchanged) ---
    const canvasWidth = 850;
    const canvasHeight = 700;
    const pegRows = 16;
    const pegSize = 5;
    const ballSize = 12; 
    const multipliers = [1000, 130, 26, 9, 4, 2, 0.2, 0.2, 0.2, 0.2, 0.2, 2, 4, 9, 26, 130, 1000];
    const payoutColors = ['#ff4557', '#ff6b45', '#ff9345', '#ffbe45', '#ffdd45', '#ffff45', '#d4ff45', '#d4ff45', '#d4ff45', '#d4ff45', '#d4ff45', '#ffff45', '#ffdd45', '#ffbe45', '#ff9345', '#ff6b45', '#ff4557'];
    const pegColor = '#ffffff';
    const pegHitColor = '#ffd700';
    const fadeDuration = 750;
    let fadingPegs = [];

    // ==========================================================
    //  NEW: Load the sound effect
    // ==========================================================
    const dropSound = new Audio('drop-sound.mp3'); // Make sure this file exists!
    dropSound.volume = 0.5; // Optional: Adjust volume from 0.0 to 1.0
    // ==========================================================

    // --- DOM Elements (Unchanged) ---
    const boardElement = document.getElementById('plinko-board');
    const dropButton = document.getElementById('drop-button');
    const payoutsContainer = document.getElementById('payouts');

    // --- Engine and Renderer Setup (Unchanged) ---
    const engine = Engine.create({ gravity: { y: 1 } });
    const render = Render.create({ element: boardElement, engine: engine, options: { width: canvasWidth, height: canvasHeight, wireframes: false, background: '#282c34' } });

    // --- Create Game Elements (Unchanged code hidden for brevity) ---
    // ... (all the code for creating pegs, walls, dividers, etc.)
    const worldObjects = [];
    const cols = pegRows + 1;
    const spacingX = canvasWidth / (cols + 1);
    const spacingY = (canvasHeight - 200) / pegRows;
    for (let row = 0; row < pegRows; row++) {
        const numPegsInRow = row + 2;
        const y = 100 + row * spacingY;
        const rowWidth = (numPegsInRow - 1) * spacingX;
        const startX = (canvasWidth - rowWidth) / 2;
        for (let col = 0; col < numPegsInRow; col++) {
            const x = startX + col * spacingX;
            const peg = Bodies.circle(x, y, pegSize, { isStatic: true, label: 'peg', render: { fillStyle: pegColor }, restitution: 0.5, friction: 0.1 });
            worldObjects.push(peg);
        }
    }
    const wallOptions = { isStatic: true, render: { visible: false } };
    worldObjects.push(Bodies.rectangle(canvasWidth / 2, canvasHeight + 50, canvasWidth, 100, wallOptions));
    worldObjects.push(Bodies.rectangle(-25, canvasHeight / 2, 50, canvasHeight, wallOptions));
    worldObjects.push(Bodies.rectangle(canvasWidth + 25, canvasHeight / 2, 50, canvasHeight, wallOptions));
    const payoutSlotWidth = canvasWidth / multipliers.length;
    for (let i = 0; i <= multipliers.length; i++) {
        const x = i * payoutSlotWidth;
        const divider = Bodies.rectangle(x, canvasHeight - 50, 4, 100, { isStatic: true, label: 'divider', render: { fillStyle: '#ffffff' } });
        worldObjects.push(divider);
        if (i < multipliers.length) {
            const sensor = Bodies.rectangle(x + payoutSlotWidth / 2, canvasHeight - 50, payoutSlotWidth, 100, { isStatic: true, isSensor: true, label: `payout_${i}`, render: { visible: false } });
            worldObjects.push(sensor);
        }
    }
    multipliers.forEach((mult, index) => {
        const box = document.createElement('div');
        box.classList.add('payout-box');
        box.id = `payout-box-${index}`;
        box.textContent = `${mult}x`;
        box.style.width = `${payoutSlotWidth}px`;
        box.style.backgroundColor = payoutColors[index];
        payoutsContainer.appendChild(box);
    });
    World.add(engine.world, worldObjects);


    // --- Game Logic ---
    const dropBall = () => {
        // ==========================================================
        //  NEW: Play the sound effect
        // ==========================================================
        // Rewind the sound to the beginning in case it's already playing
        dropSound.currentTime = 0;
        dropSound.play();
        // ==========================================================
        
        const x = canvasWidth / 2 + (Math.random() - 0.5) * 20;
        const ball = Bodies.circle(x, 30, ballSize, {
            restitution: 0.8,
            friction: 0.2,
            label: 'ball',
            render: {
                sprite: {
                    texture: './robux.svg',
                    xScale: 0.67,
                    yScale: 0.67
                }
            },
        });
        World.add(engine.world, ball);
    };

    // --- Collision and Animation Handlers (Unchanged code hidden for brevity) ---
    // ... (all the code for Events.on 'collisionStart' and 'beforeUpdate')
    Events.on(engine, 'collisionStart', (event) => {
        event.pairs.forEach((pair) => {
            const { bodyA, bodyB } = pair;
            let ball, sensor;
            if (bodyA.label === 'ball' && bodyB.label.startsWith('payout_')) { ball = bodyA; sensor = bodyB; } 
            else if (bodyB.label === 'ball' && bodyA.label.startsWith('payout_')) { ball = bodyB; sensor = bodyA; }
            if (ball && sensor) {
                World.remove(engine.world, ball);
                const payoutIndex = parseInt(sensor.label.split('_')[1]);
                const payoutBox = document.getElementById(`payout-box-${payoutIndex}`);
                if (payoutBox) {
                    payoutBox.classList.add('highlight');
                    setTimeout(() => payoutBox.classList.remove('highlight'), 500);
                }
            }
            let peg;
            if (bodyA.label === 'ball' && bodyB.label === 'peg') { peg = bodyB; } 
            else if (bodyB.label === 'ball' && bodyA.label === 'peg') { peg = bodyA; }
            if (peg) {
                if (!fadingPegs.some(p => p.peg.id === peg.id)) {
                    fadingPegs.push({ peg: peg, startTime: Date.now() });
                }
            }
        });
    });
    Events.on(engine, 'beforeUpdate', (event) => {
        const now = Date.now();
        for (let i = fadingPegs.length - 1; i >= 0; i--) {
            const item = fadingPegs[i];
            const elapsedTime = now - item.startTime;
            if (elapsedTime >= fadeDuration) {
                item.peg.render.fillStyle = pegColor;
                fadingPegs.splice(i, 1);
            } else {
                const progress = elapsedTime / fadeDuration;
                item.peg.render.fillStyle = lerpColor(pegHitColor, pegColor, progress);
            }
        }
    });

    // --- Event Listeners and Engine Start (Unchanged) ---
    dropButton.addEventListener('click', dropBall);
    Render.run(render);
    const runner = Runner.create();
    Runner.run(runner, engine);
});