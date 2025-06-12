export function findBestContainer(boxes) {
    const containers = [
        { name: '1.25T (VN)', width: 1.6, height: 1.6, length: 3.1, maxWeight: 1000 },
        { name: '2.5T (VN)', width: 1.7, height: 1.65, length: 4.2, maxWeight: 1800 },
        { name: '3.5T (VN)', width: 1.8, height: 1.8, length: 4.7, maxWeight: 2500 },
        { name: '5T (VN)', width: 2.1, height: 2.0, length: 6.0, maxWeight: 3500 },
        { name: '8T (VN)', width: 2.33, height: 2.2, length: 7.4, maxWeight: 5000 },
        { name: '10T (VN)', width: 2.4, height: 2.35, length: 9.6, maxWeight: 8500 },
        { name: '45HQ (VN)', width: 2.35, height: 2.68, length: 13.5, maxWeight: 30000 },
        { name: 'Rào (VN)', width: 2.35, height: 2.4, length: 16.0, maxWeight: 40000 },
        { name: 'Sàn (VN)', width: 2.5, height: 2.7, length: 15.0, maxWeight: 45000 },
        { name: 'Fooc 15m (VN)', width: 3.2, height: 3.2, length: 14.0, maxWeight: 50000 },
        { name: 'Fooc 17m (VN)', width: 3.2, height: 3.2, length: 17.5, maxWeight: 60000 },
        { name: 'Fooc 18m5 (VN)', width: 3.2, height: 3.2, length: 18.5, maxWeight: 65000 },
        { name: 'Fooc 19m5 (VN)', width: 3.5, height: 3.2, length: 19.5, maxWeight: 70000 },
        { name: '3T (TQ)', width: 2.3, height: 1.8, length: 4.2, maxWeight: 2000 },
        { name: '5T (TQ)', width: 2.4, height: 2.4, length: 7.6, maxWeight: 3500 },
        { name: '10T (TQ)', width: 2.4, height: 2.4, length: 9.6, maxWeight: 8500 },
        { name: '45HQ (TQ)', width: 2.35, height: 2.68, length: 13.5, maxWeight: 30000 },
        { name: '53HQ (TQ)', width: 2.6, height: 2.8, length: 16.5, maxWeight: 40000 },
        { name: '4.2m bạt (TQ)', width: 2.3, height: 2.2, length: 4.2, maxWeight: 2000 },
        { name: '7.6m bạt (TQ)', width: 2.4, height: 2.8, length: 7.6, maxWeight: 3500 },
        { name: '9.6m bạt (TQ)', width: 2.4, height: 2.8, length: 9.6, maxWeight: 4500 },
        { name: '13m bạt (TQ)', width: 2.4, height: 2.8, length: 13.0, maxWeight: 6000 },
        { name: 'Sàn 13m (TQ)', width: 3.0, height: 3.0, length: 13.75, maxWeight: 7000 },
        { name: 'Sàn 17m5 (TQ)', width: 3.0, height: 3.0, length: 17.5, maxWeight: 8000 },
    ];

    // Tính tổng khối lượng các hộp
    let totalWeight = 0;
    boxes.forEach(box => {
        totalWeight += (box.weight || 0) * (box.quantity || 1);
    });

    for (const c of containers) {
        if (c.maxWeight && totalWeight > c.maxWeight) continue; // Bỏ qua nếu quá tải
        const result = packBoxes(c.width, c.height, c.length, boxes);
        if (result.unpacked.length === 0) {
            return { ...c, packed: result.packed, totalWeight };
        }
    }
    return null;
}

// Hàm chính để xếp hộp vào container
export function packBoxes(containerWidth, containerHeight, containerLength, boxes) {
    // Tạo danh sách tất cả các hộp (theo số lượng)
    const allBoxes = [];
    boxes.forEach(box => { // Lặp qua từng loại hộp
        for (let i = 0; i < box.quantity; i++) { // Thêm từng hộp đơn lẻ vào mảng
            allBoxes.push({ width: box.width, height: box.height, length: box.length, color: box.color }); // Lưu kích thước và màu
        }
    });

    // Sắp xếp hộp theo thể tích giảm dần (ưu tiên hộp to trước)
    allBoxes.sort((a, b) => (b.width * b.height * b.length) - (a.width * a.height * a.length));

    // Lưu thông tin container
    const container = {
        width: containerWidth,
        height: containerHeight,
        length: containerLength
    };

    const packed = [];    // Danh sách hộp đã xếp được
    const unpacked = [];  // Danh sách hộp không xếp được
    let spaces = [{       // Danh sách các khối không gian còn trống
        x: 0, y: 0, z: 0,
        width: containerWidth,
        height: containerHeight,
        length: containerLength
    }];

    // Hàm kiểm tra khối a nằm hoàn toàn trong khối b
    function isContained(a, b) {
        return (
            a.x >= b.x &&
            a.y >= b.y &&
            a.z >= b.z &&
            a.x + a.width <= b.x + b.width &&
            a.y + a.height <= b.y + b.height &&
            a.z + a.length <= b.z + b.length
        );
    }

    // Loại bỏ các khối không gian bị lồng nhau
    function pruneSpaces(spaces) {
        return spaces.filter((s, i, arr) =>
            !arr.some((other, j) => j !== i && isContained(s, other)) // Giữ lại các khối không bị chứa hoàn toàn trong khối khác
        );
    }

    // Sinh ra tất cả các hướng xoay hợp lệ của hộp (6 hướng)
    function getOrientations(box) {
        const dims = [box.width, box.height, box.length];
        const orientations = [];
        [
            [0, 1, 2],
            [0, 2, 1],
            [1, 0, 2],
            [1, 2, 0],
            [2, 0, 1],
            [2, 1, 0]
        ].forEach(order => {
            orientations.push({
                width: dims[order[0]],
                height: dims[order[1]],
                length: dims[order[2]],
                color: box.color
            });
        });
        // Loại bỏ các hướng trùng lặp (nếu hộp là lập phương)
        return orientations.filter((o, idx, arr) =>
            arr.findIndex(oo => oo.width === o.width && oo.height === o.height && oo.length === o.length) === idx
        );
    }

    // Tìm vị trí tốt nhất để đặt hộp (thử mọi hướng xoay)
    function findBestSpace(box, spaces) {
        let best = null;
        let bestIdx = -1;
        let bestOrientation = null;
        let bestY = Infinity, bestX = Infinity, bestZ = Infinity;
        const orientations = getOrientations(box); // Lấy các hướng xoay hợp lệ
        for (let i = 0; i < spaces.length; i++) { // Duyệt qua từng khối không gian trống
            const s = spaces[i];
            for (const o of orientations) { // Duyệt qua từng hướng xoay
                if (o.width <= s.width && o.height <= s.height && o.length <= s.length) { // Nếu hộp vừa khối không gian
                    // Ưu tiên vị trí thấp nhất (y nhỏ nhất), rồi x, rồi z
                    if (
                        s.y < bestY ||
                        (s.y === bestY && s.x < bestX) ||
                        (s.y === bestY && s.x === bestX && s.z < bestZ)
                    ) {
                        best = s;
                        bestIdx = i;
                        bestOrientation = o;
                        bestY = s.y;
                        bestX = s.x;
                        bestZ = s.z;
                    }
                }
            }
        }
        // Trả về vị trí và hướng xoay tốt nhất (nếu có)
        return best ? { idx: bestIdx, orientation: bestOrientation } : null;
    }

    // Vòng lặp xếp từng hộp
    allBoxes.forEach(box => {
        const found = findBestSpace(box, spaces); // Tìm vị trí tốt nhất cho hộp này
        if (!found) { // Nếu không có chỗ, đưa vào danh sách không xếp được
            unpacked.push(box);
            return;
        }
        const { idx, orientation } = found;
        const space = spaces[idx];
        // Thêm hộp vào danh sách đã xếp, lưu vị trí và hướng xoay
        packed.push({
            x: space.x,
            y: space.y,
            z: space.z,
            width: orientation.width,
            height: orientation.height,
            length: orientation.length,
            color: orientation.color
        });

        // Chia không gian còn lại thành 3 khối (bên phải, phía trên, phía sau)
        const newSpaces = [];
        // Bên phải hộp vừa đặt
        if (space.width - orientation.width > 0) {
            newSpaces.push({
                x: space.x + orientation.width,
                y: space.y,
                z: space.z,
                width: space.width - orientation.width,
                height: space.height,
                length: space.length
            });
        }
        // Phía trên hộp vừa đặt
        if (space.height - orientation.height > 0 && box.stackable !== false) {
            newSpaces.push({
                x: space.x,
                y: space.y + orientation.height,
                z: space.z,
                width: space.width, // mở rộng toàn bộ chiều rộng của không gian gốc
                height: space.height - orientation.height,
                length: space.length // mở rộng toàn bộ chiều dài của không gian gốc
            });
        }
        // Phía sau hộp vừa đặt
        if (space.length - orientation.length > 0) {
            newSpaces.push({
                x: space.x,
                y: space.y,
                z: space.z + orientation.length,
                width: orientation.width,
                height: orientation.height,
                length: space.length - orientation.length
            });
        }

        // Xóa khối không gian đã dùng và thêm các khối mới
        spaces.splice(idx, 1);
        spaces.push(...newSpaces);

        // Loại bỏ các khối không gian bị lồng nhau
        spaces = pruneSpaces(spaces);
    });

    // Trả về kết quả: container, danh sách hộp đã xếp, hộp không xếp được
    return { container, packed, unpacked };
}