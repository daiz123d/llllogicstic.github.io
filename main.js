import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.122.0/build/three.module.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.122.0/examples/jsm/controls/OrbitControls.js';
import { packBoxes, findBestContainer } from './binPacking.js';

// Khai báo biến toàn cục
let scene, camera, renderer, controls;
let boxes = [];
let containerMesh, containerEdges;

let stepIndex = 0;
let stepPacked = [];
let stepResult = null;
let stepInterval = null;

// Khởi tạo sự kiện cho các nút tua
document.getElementById('stepNextBtn').addEventListener('click', stepNext);
document.getElementById('stepPrevBtn').addEventListener('click', stepPrev);
document.getElementById('stepPauseBtn').addEventListener('click', stepPause);

function stepNext() {
  if (!stepResult) {
    const cw = parseFloat(document.getElementById('containerWidth').value);
    const ch = parseFloat(document.getElementById('containerHeight').value);
    const cl = parseFloat(document.getElementById('containerLength').value);
    stepResult = packBoxes(cw, ch, cl, boxes);
    stepPacked = [];
    stepIndex = 0;
    scene.children.filter(c => c.userData.isBox).forEach(b => scene.remove(b));
    updatePackedBoxTable([]);
  }
  if (stepIndex < stepResult.packed.length) {
    const b = stepResult.packed[stepIndex];
    const scale = 100;
    const g = new THREE.BoxGeometry(b.width * scale, b.height * scale, b.length * scale);
    const m = new THREE.MeshStandardMaterial({ color: b.color || '#'+Math.floor(Math.random()*16777215).toString(16).padStart(6, '0') });
    const mesh = new THREE.Mesh(g, m);
    mesh.position.set((b.x + b.width / 2) * scale, (b.y + b.height / 2) * scale, (b.z + b.length / 2) * scale);
    mesh.userData.isBox = true;
    scene.add(mesh);
    stepPacked.push(b);
    updatePackedBoxTable(stepPacked);
    stepIndex++;
  } else {
    showModal('Thông báo', 'Đã xếp hết các thùng!', 'success');
    stepPause();
  }
}

function stepPrev() {
  if (stepIndex > 0) {
    stepIndex--;
    stepPacked.pop();
    // Xóa tất cả hộp và vẽ lại các hộp đã stepPacked
    scene.children.filter(c => c.userData.isBox).forEach(b => scene.remove(b));
    const scale = 100;
    stepPacked.forEach(b => {
      const g = new THREE.BoxGeometry(b.width * scale, b.height * scale, b.length * scale);
      const m = new THREE.MeshStandardMaterial({ color: b.color || '#'+Math.floor(Math.random()*16777215).toString(16).padStart(6, '0') });
      const mesh = new THREE.Mesh(g, m);
      mesh.position.set((b.x + b.width / 2) * scale, (b.y + b.height / 2) * scale, (b.z + b.length / 2) * scale);
      mesh.userData.isBox = true;
      scene.add(mesh);
    });
    updatePackedBoxTable(stepPacked);
  }
}

function stepPause() {
  if (stepInterval) {
    clearInterval(stepInterval);
    stepInterval = null;
  }
}

// Nếu muốn tự động tua tới, có thể thêm nút "Play" và dùng setInterval gọi stepNext()

// Reset trạng thái step khi xếp lại hoặc đặt lại
document.getElementById('resetBtn').addEventListener('click', () => {
  stepResult = null;
  stepPacked = [];
  stepIndex = 0;
  stepPause();
});
document.getElementById('submitBtn').addEventListener('click', () => {
  stepResult = null;
  stepPacked = [];
  stepIndex = 0;
  stepPause();
});

init();
animate();

function init() {
  // Khởi tạo cảnh 3D
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 10000);
  
  // Đặt vị trí camera để xem toàn cảnh container
  const cw = parseFloat(document.getElementById('containerWidth').value) || 5;
  const ch = parseFloat(document.getElementById('containerHeight').value) || 3;
  const cl = parseFloat(document.getElementById('containerLength').value) || 4;
  const maxDim = Math.max(cw, ch, cl);
  camera.position.set(maxDim * 100 * 1.5, maxDim * 100 * 1.5, maxDim * 100 * 1.5);
  camera.lookAt(cw * 50, ch * 50, cl * 50);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  const containerElem = document.getElementById('threeD-container');
  renderer.setSize(containerElem.clientWidth, containerElem.clientHeight);
  containerElem.appendChild(renderer.domElement);

  // Cấu hình OrbitControls để xem 360 độ
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.screenSpacePanning = true;
  controls.minDistance = maxDim * 10; // Khoảng cách tối thiểu để zoom vào
  controls.maxDistance = maxDim * 1000; // Khoảng cách tối đa để zoom ra
  controls.target.set(cw * 50, ch * 50, cl * 50); // Điểm nhìn mặc định là trung tâm container
  controls.update();

  // Thêm ánh sáng
  const light = new THREE.DirectionalLight(0xffffff, 1.0); // Tăng độ sáng
  light.position.set(maxDim * 100, maxDim * 200, maxDim * 100);
  scene.add(light);
  const ambientLight = new THREE.AmbientLight(0x606060); // Ánh sáng môi trường sáng hơn
  scene.add(ambientLight);

  // Thêm mặt phẳng nền
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(5000, 5000),
    new THREE.MeshStandardMaterial({ color: 0x808080 })
  );
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  // Hiển thị container mặc định
  updateContainerVisualization();

  // Xử lý thay đổi kích thước cửa sổ
  window.addEventListener('resize', () => {
    const containerElem = document.getElementById('threeD-container');
    if (!containerElem) return;
    const width = containerElem.clientWidth;
    const height = containerElem.clientHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  });

  // Sự kiện thay đổi kích thước container
  ['containerWidth', 'containerHeight', 'containerLength'].forEach(id => {
    document.getElementById(id).addEventListener('input', () => {
      updateContainerVisualization();
      updateBoxVisualization();
      // Cập nhật camera và controls
      const cw = parseFloat(document.getElementById('containerWidth').value) || 5;
      const ch = parseFloat(document.getElementById('containerHeight').value) || 3;
      const cl = parseFloat(document.getElementById('containerLength').value) || 4;
      const maxDim = Math.max(cw, ch, cl);
      camera.position.set(maxDim * 100 * 1.5, maxDim * 100 * 1.5, maxDim * 100 * 1.5);
      controls.target.set(cw * 50, ch * 50, cl * 50);
      controls.minDistance = maxDim * 10;
      controls.maxDistance = maxDim * 1000;
      controls.update();
    });
  });

  // Sự kiện nút Thêm Hộp
  document.getElementById('addBoxBtn').addEventListener('click', () => {
    boxes.push({ width: 1, height: 1, length: 1, quantity: 1 });
    updateBoxList();
    updateBoxVisualization();
  });

  // Sự kiện nút Xuất Hộp
  document.getElementById('exportBoxBtn').addEventListener('click', () => {
    exportBoxes();
  });

  // Sự kiện gửi form
  document.getElementById('binPackingForm').addEventListener('submit', (e) => {
    e.preventDefault();
    if (validateInputs()) {
      onPack(); // Không hiển thị modal khi xếp hộp
    } else {
      showModal('Lỗi', 'Vui lòng nhập các kích thước dương hợp lệ cho tất cả trường.', 'danger');
    }
  });

  // Sự kiện nút Đặt Lại
  document.getElementById('resetBtn').addEventListener('click', () => {
    boxes = [];
    document.getElementById('containerWidth').value = 5;
    document.getElementById('containerHeight').value = 3;
    document.getElementById('containerLength').value = 4;
    document.getElementById('result').style.display = 'none';
    document.getElementById('containerInfo').style.display = 'none';
    scene.children.filter(c => c.userData.isBox || c === containerMesh || c === containerEdges).forEach(b => scene.remove(b));
    updateBoxList();
    updateContainerVisualization();
    // Reset camera và controls
    const maxDim = 5; // Kích thước container mặc định
    camera.position.set(maxDim * 100 * 1.5, maxDim * 100 * 1.5, maxDim * 100 * 1.5);
    controls.target.set(5 * 50, 3 * 50, 4 * 50);
    controls.minDistance = maxDim * 10;
    controls.maxDistance = maxDim * 1000;
    controls.update();
    showModal('Thành Công', 'Đã đặt lại form và cảnh!');
  });

  // Sự kiện liên kết Thông Tin Container
  document.getElementById('containerInfoLink').addEventListener('click', (e) => {
    e.preventDefault();
    const containerInfoSection = document.getElementById('containerInfo');
    containerInfoSection.style.display = 'block';
    containerInfoSection.scrollIntoView({ behavior: 'smooth' });
  });

  // Sự kiện nút Tìm Container Tối Ưu
  document.getElementById('autoContainerBtn').addEventListener('click', () => {
    if (!validateInputs()) {
      showModal('Lỗi', 'Vui lòng nhập các kích thước và số lượng hợp lệ.', 'danger');
      return;
    }
    // Bạn có thể cho phép nhập khoảng min/max hoặc dùng giá trị mặc định
    const minW = 2, minH = 2, minL = 2;
    const maxW = 5, maxH = 5, maxL = 12;
    const step = 0.1;
    showModal('Đang tính toán', 'Hệ thống đang tìm container tối ưu, vui lòng chờ...', 'info');
    setTimeout(() => {
      const result = findBestContainer(boxes);
      if (result) {
        document.getElementById('containerWidth').value = result.width.toFixed(2);
        document.getElementById('containerHeight').value = result.height.toFixed(2);
        document.getElementById('containerLength').value = result.length.toFixed(2);

        // Hiển thị tên xe/container đã chọn
        document.getElementById('containerTypeInfo').textContent = `Đã chọn: ${result.name}`;

        showModal('Thành Công', `Đã tìm được container tối ưu: ${result.name} (${result.width.toFixed(2)} x ${result.height.toFixed(2)} x ${result.length.toFixed(2)} m)`, 'success');
        updateContainerVisualization();
      } else {
        showModal('Lỗi', 'Không tìm được container phù hợp!', 'danger');
      }
    }, 100); // Cho phép modal hiển thị trước khi tính toán
  });

  updateBoxList();
}

// Kiểm tra dữ liệu đầu vào
function validateInputs() {
  const inputs = ['containerWidth', 'containerHeight', 'containerLength'];
  let isValid = true;

  inputs.forEach(id => {
    const input = document.getElementById(id);
    const value = parseFloat(input.value);
    if (isNaN(value) || value <= 0) {
      input.classList.add('is-invalid');
      input.classList.remove('is-valid');
      isValid = false;
    } else {
      input.classList.remove('is-invalid');
      input.classList.add('is-valid');
    }
  });

  boxes.forEach((box, i) => {
    ['width', 'height', 'length', 'quantity'].forEach(prop => {
      if (box[prop] <= 0 || isNaN(box[prop])) {
        isValid = false;
      }
    });
  });

  return isValid;
}

// Cập nhật hiển thị container
function updateContainerVisualization() {
  if (containerMesh) scene.remove(containerMesh);
  if (containerEdges) scene.remove(containerEdges);

  const cw = parseFloat(document.getElementById('containerWidth').value) || 5;
  const ch = parseFloat(document.getElementById('containerHeight').value) || 3;
  const cl = parseFloat(document.getElementById('containerLength').value) || 4;

  const scale = 100;
  const geom = new THREE.BoxGeometry(cw * scale, ch * scale, cl * scale);
  
  // Vật liệu trong suốt cho container
  const mat = new THREE.MeshBasicMaterial({ 
    color: 0x007bff, 
    transparent: true, 
    opacity: 0.2 
  });
  containerMesh = new THREE.Mesh(geom, mat);
  containerMesh.position.set(cw * scale / 2, ch * scale / 2, cl * scale / 2);
  scene.add(containerMesh);

  // Thêm đường viền đậm
  const edges = new THREE.EdgesGeometry(geom);
  containerEdges = new THREE.LineSegments(
    edges,
    new THREE.LineBasicMaterial({ color: 0x004080, linewidth: 2 }) // Đường viền xanh đậm
  );
  containerEdges.position.set(cw * scale / 2, ch * scale / 2, cl * scale / 2);
  scene.add(containerEdges);
}

// Cập nhật hiển thị hộp (trước khi xếp)
function updateBoxVisualization() {
  // Xóa các hộp hiện tại
  scene.children.filter(c => c.userData.isBox).forEach(b => scene.remove(b));

  boxes.forEach(box => {
    for (let i = 0; i < box.quantity; i++) {
      const geometry = new THREE.BoxGeometry(box.width * 100, box.height * 100, box.length * 100);
      // Sử dụng màu đã chọn, nếu không có thì mặc định
      const color = box.color || '#'+Math.floor(Math.random()*16777215).toString(16).padStart(6, '0');
      const material = new THREE.MeshStandardMaterial({ color: color });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(box.width * 100 / 2, currentY + box.height * 100 / 2, box.length * 100 / 2);
      mesh.userData.isBox = true;
      scene.add(mesh);
    }
  });
}

// Xử lý xếp hộp
function onPack() {
  // Xóa container và các hộp cũ khỏi scene
  if (containerMesh) scene.remove(containerMesh);
  if (containerEdges) scene.remove(containerEdges);
  scene.children.filter(c => c.userData.isBox).forEach(b => scene.remove(b));

  const cw = parseFloat(document.getElementById('containerWidth').value);
  const ch = parseFloat(document.getElementById('containerHeight').value);
  const cl = parseFloat(document.getElementById('containerLength').value);

  const result = packBoxes(cw, ch, cl, boxes);
  const scale = 100;

  const geom = new THREE.BoxGeometry(cw * scale, ch * scale, cl * scale);
  const mat = new THREE.MeshBasicMaterial({ 
    color: 0x007bff, 
    transparent: true, 
    opacity: 0.2 
  });
  containerMesh = new THREE.Mesh(geom, mat);
  containerMesh.position.set(cw * scale / 2, ch * scale / 2, cl * scale / 2);
  scene.add(containerMesh);

  // Thêm đường viền đậm
  const edges = new THREE.EdgesGeometry(geom);
  containerEdges = new THREE.LineSegments(
    edges,
    new THREE.LineBasicMaterial({ color: 0x004080, linewidth: 2 })
  );
  containerEdges.position.set(cw * scale / 2, ch * scale / 2, cl * scale / 2);
  scene.add(containerEdges);

  result.packed.forEach((b, index) => {
    const g = new THREE.BoxGeometry(b.width * scale, b.height * scale, b.length * scale);
    const m = new THREE.MeshStandardMaterial({ color: b.color || '#'+Math.floor(Math.random()*16777215).toString(16).padStart(6, '0') });
    const mesh = new THREE.Mesh(g, m);
    mesh.position.set((b.x + b.width / 2) * scale, (b.y + b.height / 2) * scale, (b.z + b.length / 2) * scale);
    mesh.userData.isBox = true;
    scene.add(mesh);
  });

  updatePackedBoxTable(result.packed);

  const resultDiv = document.getElementById('result');
  resultDiv.innerHTML = `
    <p><strong>Đã Xếp:</strong> ${result.packed.length}</p>
    <p><strong>Chưa Xếp:</strong> ${result.unpacked.length}</p>
  `;
  resultDiv.style.display = 'block';

  document.getElementById('containerInfo').style.display = 'block';
  document.getElementById('containerInfo').scrollIntoView({ behavior: 'smooth' });
}

// Cập nhật bảng kết quả xếp hộp
function updatePackedBoxTable(packedBoxes) {
  const tableBody = document.getElementById('packedBoxesTable');
  tableBody.innerHTML = '';
  packedBoxes.forEach((box, index) => {
    const row = tableBody.insertRow();
    row.innerHTML = `
      <td>${index + 1}</td>
      <td>${box.width}</td>
      <td>${box.height}</td>
      <td>${box.length}</td>
      <td>(${box.x}, ${box.y}, ${box.z})</td>
    `;
  });
}

// Cập nhật danh sách hộp
function updateBoxList() {
  const boxList = document.getElementById('boxList');
  boxList.innerHTML = '';
  boxes.forEach((b, i) => {
    const color = b.color || '#'+Math.floor(Math.random()*16777215).toString(16).padStart(6, '0');
    b.color = color; // Đảm bảo luôn có màu
    const row = boxList.insertRow();
    row.innerHTML = `
      <td><input type="number" class="form-control form-control-sm" value="${b.width}" min="0.1" step="0.1" onchange="updateBox(${i}, 'width', this.value)" /></td>
      <td><input type="number" class="form-control form-control-sm" value="${b.height}" min="0.1" step="0.1" onchange="updateBox(${i}, 'height', this.value)" /></td>
      <td><input type="number" class="form-control form-control-sm" value="${b.length}" min="0.1" step="0.1" onchange="updateBox(${i}, 'length', this.value)" /></td>
      <td><input type="number" class="form-control form-control-sm" value="${b.quantity}" min="1" step="1" onchange="updateBox(${i}, 'quantity', this.value)" /></td>
      <td><input type="color" class="form-control form-control-sm" value="${color}" onchange="updateBox(${i}, 'color', this.value)" /></td>
      <td><button class="btn btn-danger btn-sm" onclick="removeBox(${i})">Xóa</button></td>
    `;
  });
}

// Cập nhật thông tin hộp
window.updateBox = (i, prop, val) => {
  if (prop === 'color') {
    boxes[i][prop] = val;
  } else {
    const value = parseFloat(val);
    if (isNaN(value) || value <= 0) {
      showModal('Lỗi', 'Vui lòng nhập giá trị dương hợp lệ.', 'danger');
      return;
    }
    boxes[i][prop] = value;
  }
  updateBoxList();
  updateBoxVisualization();
};

// Xóa hộp
window.removeBox = i => {
  boxes.splice(i, 1);
  updateBoxList();
  updateBoxVisualization();
  showModal('Thành Công', 'Đã xóa hộp thành công!');
};

// Xuất hộp sang Excel
window.exportBoxes = () => {
  if (boxes.length === 0) {
    showModal('Lỗi', 'Không có hộp để xuất.', 'danger');
    return;
  }
  // Chuẩn bị dữ liệu cho Excel
  const data = boxes.map(box => ({
    'Chiều Rộng (m)': box.width,
    'Chiều Cao (m)': box.height,
    'Chiều Dài (m)': box.length,
    'Số Lượng': box.quantity
  }));
  // Tạo worksheet
  const ws = XLSX.utils.json_to_sheet(data);
  // Tạo workbook
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Hộp');
  // Xuất tệp Excel
  XLSX.writeFile(wb, 'hop.xlsx');
  showModal('Thành Công', 'Đã xuất hộp thành công!');
};

let notificationModalInstance = null;

function showModal(title, message, type = 'primary') {
  document.getElementById('notificationModalLabel').textContent = title;
  document.getElementById('notificationMessage').innerHTML = message;
  const modalHeader = document.querySelector('#notificationModal .modal-header');
  modalHeader.className = `modal-header bg-${type} text-white`;
  if (!notificationModalInstance) {
    notificationModalInstance = new bootstrap.Modal(document.getElementById('notificationModal'));
  }
  notificationModalInstance.show();

  // Đảm bảo modal sẽ tự động đóng và backdrop sẽ bị xóa
  setTimeout(() => {
    notificationModalInstance.hide();
    // Xóa backdrop nếu còn sót lại
    document.querySelectorAll('.modal-backdrop').forEach(e => e.remove());
    document.body.classList.remove('modal-open');
    document.body.style = '';
  }, 1500);
}

// Vòng lặp hoạt hình
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}

// Reset trạng thái step khi xếp lại hoặc đặt lại
document.getElementById('resetBtn').addEventListener('click', () => {
  stepResult = null;
  stepPacked = [];
  stepIndex = 0;
  stepPause();
});
document.getElementById('submitBtn').addEventListener('click', () => {
  stepResult = null;
  stepPacked = [];
  stepIndex = 0;
  stepPause();
});

// Ví dụ: tìm container nhỏ nhất trong khoảng 2-5m, bước 0.1m
const result = findBestContainer(boxes, 2, 2, 2, 5, 5, 12, 0.1);
if (result) {
    console.log('Container tối ưu:', result.width, result.height, result.length);
    // result.packed là danh sách hộp đã xếp
} else {
    console.log('Không tìm được container phù hợp!');
}

window.boxes = boxes;
window.updateBoxList = updateBoxList;
window.updateBoxVisualization = updateBoxVisualization;