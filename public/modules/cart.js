import { db } from '../assets/firebase.js'; 
import { collection, onSnapshot, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

let cart = [];
let menuItems = [];
let currentCategory = 'All';
let map, marker;

// --- 1. MENU SYSTEM (WITH STOCK SYNC) ---
const loadMenu = () => {
    onSnapshot(collection(db, "menu"), (snap) => {
        menuItems = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderMenu();
    });
};

window.filterMenu = (category) => {
    currentCategory = category;
    // Update active UI for buttons
    document.querySelectorAll('.cat-btn').forEach(btn => {
        btn.classList.toggle('active', btn.innerText === category);
    });
    renderMenu();
};

const renderMenu = () => {
    const grid = document.getElementById('product-grid');
    if (!grid) return;
    grid.innerHTML = '';
    
    const filtered = menuItems.filter(p => currentCategory === 'All' || p.category === currentCategory);
    
    filtered.forEach(p => {
        // Check if item is out of stock based on your Admin status
        const isOutOfStock = p.status === "Out of Stock";
        
        grid.innerHTML += `
            <div class="food-card ${isOutOfStock ? 'sold-out' : ''}">
                <img src="${p.imageUrl}" class="food-img" onerror="this.src='../Images/Bunlogo.png'">
                <div class="food-info">
                    <h3>${p.name}</h3>
                    <span class="price">₱${Number(p.price).toLocaleString()}</span>
                    ${isOutOfStock 
                        ? `<span style="background:#eee; color:#888; padding:5px 10px; border-radius:8px; font-size:11px; font-weight:700; position:absolute; bottom:12px; right:12px;">Sold Out</span>` 
                        : `<button class="btn-add-small" onclick="addToCart('${p.name}', ${p.price})">+</button>`
                    }
                </div>
            </div>`;
    });
};

// --- 2. LEAFLET MAP ---
window.initMapSelector = () => {
    const mapEl = document.getElementById('map-canvas');
    mapEl.style.display = 'block';
    const defaultPos = [14.5995, 120.9842];

    if (!map) {
        map = L.map('map-canvas').setView(defaultPos, 15);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap'
        }).addTo(map);

        marker = L.marker(defaultPos, { draggable: true }).addTo(map);

        const updateAddress = async (lat, lng) => {
            document.getElementById('cust-lat').value = lat;
            document.getElementById('cust-lng').value = lng;
            try {
                const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
                const data = await response.json();
                if (data.display_name) {
                    document.getElementById('cust-address').value = data.display_name;
                }
            } catch (error) { console.error("Address fetch failed", error); }
        };

        marker.on('dragend', (e) => updateAddress(e.target.getLatLng().lat, e.target.getLatLng().lng));
        map.on('click', (e) => {
            marker.setLatLng(e.latlng);
            updateAddress(e.latlng.lat, e.latlng.lng);
        });

        map.locate({setView: true, maxZoom: 16});
        map.on('locationfound', (e) => {
            marker.setLatLng(e.latlng);
            updateAddress(e.latlng.lat, e.latlng.lng);
        });
    } else {
        setTimeout(() => map.invalidateSize(), 100);
    }
};

// --- 3. CART LOGIC (WITH FEEDBACK ANIMATION) ---
window.addToCart = (name, price) => {
    const existing = cart.find(item => item.name === name);
    if(existing) existing.qty++;
    else cart.push({ name, price: Number(price), qty: 1 });
    
    // Add a tiny "pop" effect to the basket bar
    const basketBar = document.getElementById('basket-bar');
    basketBar.style.transform = "scale(1.05)";
    setTimeout(() => basketBar.style.transform = "scale(1)", 150);
    
    updateUI();
};

window.changeQty = (index, delta) => {
    cart[index].qty += delta;
    if(cart[index].qty <= 0) cart.splice(index, 1);
    updateUI();
};

window.clearCart = () => {
    if(confirm("Clear basket?")) { cart = []; updateUI(); window.toggleCart(false); }
};

window.toggleCart = (show) => {
    document.getElementById('cart-drawer').classList.toggle('open', show);
    document.getElementById('overlay').style.display = show ? 'block' : 'none';
};

function updateUI() {
    const list = document.getElementById('cart-items-list');
    if (cart.length > 0) {
        list.innerHTML = `<div style="text-align:right; padding-bottom:10px;"><button onclick="clearCart()" style="background:none; border:none; color:#ff6b6b; cursor:pointer; font-weight:600;">🗑️ Clear All</button></div>`;
    } else {
        list.innerHTML = `<p style="text-align:center; color:#999; margin-top:40px;">Basket is empty</p>`;
    }

    cart.forEach((item, index) => {
        list.innerHTML += `
            <div style="display:flex; justify-content:space-between; align-items:center; padding:12px 0; border-bottom:1px solid #f0f0f0;">
                <div style="flex:1;">
                    <div style="font-weight:700; font-size:14px;">${item.name}</div>
                    <div style="font-size:12px; color:var(--primary);">₱${item.price}</div>
                </div>
                <div style="display:flex; align-items:center; gap:10px; background:#f8f9fa; padding:5px 10px; border-radius:10px;">
                    <button onclick="changeQty(${index}, -1)" style="border:none; background:none; cursor:pointer; font-weight:800;">-</button>
                    <span style="font-weight:700; font-size:14px; min-width:15px; text-align:center;">${item.qty}</span>
                    <button onclick="changeQty(${index}, 1)" style="border:none; background:none; cursor:pointer; font-weight:800;">+</button>
                </div>
                <div style="margin-left:15px; font-weight:800; width:70px; text-align:right;">₱${(item.price * item.qty).toLocaleString()}</div>
            </div>`;
    });
    
    let total = cart.reduce((acc, i) => acc + (i.price * i.qty), 0);
    document.getElementById('cart-total').innerText = `₱${total.toLocaleString()}`;
    document.getElementById('basket-count').innerText = cart.reduce((acc, i) => acc + i.qty, 0);
    document.getElementById('basket-bar').style.display = cart.length > 0 ? 'flex' : 'none';
}

// --- 4. CHECKOUT PROCESS ---
window.startCheckoutProcess = () => {
    if(cart.length === 0) return;
    document.getElementById('info-modal').style.display = 'flex';
    window.toggleCart(false);
};

window.closeInfoModal = () => {
    document.getElementById('info-modal').style.display = 'none';
};

window.backToInfo = () => {
    document.getElementById('step-confirm').style.display = 'none';
    document.getElementById('step-info').style.display = 'block';
};

window.showConfirmation = () => {
    const name = document.getElementById('cust-name').value;
    const phone = document.getElementById('cust-phone').value;
    const addr = document.getElementById('cust-address').value;
    
    if(!name || !phone || !addr) return alert("Please fill in your name, phone, and pin your location!");
    
    document.getElementById('step-info').style.display = 'none';
    document.getElementById('step-confirm').style.display = 'block';
    
    const itemsSummary = cart.map(i => `<div>${i.name} <span style="float:right;">x${i.qty}</span></div>`).join('');
    
    document.getElementById('order-summary-box').innerHTML = `
        <div style="border-bottom: 1px dashed #ff6b6b; padding-bottom:10px; margin-bottom:10px;">
            ${itemsSummary}
        </div>
        <strong>To:</strong> ${name}<br>
        <strong>Phone:</strong> ${phone}<br>
        <strong>Address:</strong> <span style="font-size:11px;">${addr}</span><br>
        <hr style="border:0; border-top:1px solid #eee; margin:10px 0;">
        <strong style="font-size:18px; color:var(--primary);">Total: ${document.getElementById('cart-total').innerText}</strong>`;
};

window.submitFinalOrder = async () => {
    const btn = document.getElementById('final-submit-btn');
    btn.disabled = true;
    btn.innerText = "Processing...";

    try {
        const rawTotal = cart.reduce((acc, i) => acc + (i.price * i.qty), 0);

        const orderData = {
            customerName: document.getElementById('cust-name').value,
            phone: document.getElementById('cust-phone').value,
            address: document.getElementById('cust-address').value,
            landmark: document.getElementById('cust-landmark').value || "",
            coords: { 
                lat: document.getElementById('cust-lat').value, 
                lng: document.getElementById('cust-lng').value 
            },
            items: cart, 
            totalPrice: rawTotal, 
            total: rawTotal, 
            status: "Pending",
            createdAt: serverTimestamp()
        };

        const docRef = await addDoc(collection(db, "orders"), orderData);
        localStorage.setItem('last_bunbites_order', docRef.id);

        alert("Order Placed Successfully! 🍩");
        window.location.href = `track.html?id=${docRef.id}`;

    } catch (e) { 
        console.error("Order Error: ", e);
        alert("Error: " + e.message); 
        btn.disabled = false; 
        btn.innerText = "CONFIRM & PAY (COD)";
    }
};

loadMenu();