# New Scratch Card Structure

## Tổng quan
Đã cập nhật cấu trúc của scratch cards theo yêu cầu mới với 3 phần chính:
1. **Product Title & Ticket Info** 
2. **4 Ô tròn scratch** (giống nhau nếu thắng, khác nhau nếu thua)
3. **Danh sách Available Prizes** (ưu tiên icon, fallback image)

## Cấu trúc HTML mới

```html
<div class="ticket-result-new win/lose">
  <!-- 1. Product Title Section -->
  <div class="product-title-section">
    <h4 class="product-title">Product Name</h4>
    <div class="ticket-info">Ticket #123</div>
  </div>
  
  <!-- 2. Scratch Circles Section -->
  <div class="scratch-circles-section">
    <div class="scratch-circles-container">
      <div class="scratch-circle" data-circle="0">
        <div class="circle-content win-content/lose-content">
          <!-- Win: Same icon x4 | Lose: Different icons -->
        </div>
        <canvas class="circle-canvas" width="80" height="80"></canvas>
      </div>
      <!-- 3 more circles... -->
    </div>
  </div>
  
  <!-- 3. Available Prizes Section -->
  <div class="available-prizes-section">
    <h5 class="prizes-title">Available Prizes:</h5>
    <div class="prizes-list">
      <div class="prize-item">
        <span class="prize-icon">🎁</span>
        <span class="prize-name">Prize Name</span>
      </div>
      <!-- More prizes... -->
    </div>
  </div>
</div>
```

## Logic thay đổi

### 1. Win vs Lose Logic
- **WIN**: Tất cả 4 ô có cùng icon của prize đó thắng
- **LOSE**: 4 ô có icon khác nhau: ❌, 💔, 😞, 🚫

### 2. Prize Icon Priority
1. **icon_prize** (ưu tiên)
2. **d_prize_image** (fallback)
3. **🎁** (default)

### 3. Scratch Functionality
- Mỗi ô tròn có canvas riêng 80x80px
- Independent scratch cho từng ô
- Save/load progress cho từng ô riêng biệt

## JavaScript Updates

### New Functions:
- `createTicketResultHTML()` - Tạo HTML structure mới
- `createScratchCirclesHTML()` - Tạo 4 ô tròn với logic win/lose
- `createAvailablePrizesHTML()` - Tạo danh sách prizes
- `initializeScratchCardCircles()` - Init scratch cho từng ô
- `scratchCircle()` - Scratch function cho ô tròn

### Updated Functions:
- `populateScratchSliderCards()` - Dùng structure mới
- `revealAllScratchCards()` - Clear tất cả circle canvas
- `saveScratchSliderProgress()` - Save progress từng ô
- `loadScratchSliderProgress()` - Load progress từng ô

## CSS Updates

### New Classes:
- `.ticket-result-new` - Container cho structure mới
- `.product-title-section` - Section title & ticket info
- `.scratch-circles-section` - Section chứa 4 ô tròn
- `.scratch-circles-container` - Container flex cho 4 ô
- `.scratch-circle` - Từng ô tròn 80x80px
- `.circle-content` - Content bên dưới scratch layer
- `.circle-canvas` - Canvas overlay cho scratch
- `.available-prizes-section` - Section danh sách prizes
- `.prizes-list` - Flex container cho prizes
- `.prize-item` - Từng prize item

### Responsive Design:
- **Desktop**: 4 ô 80x80px trên 1 hàng
- **Tablet** (768px): 4 ô 60x60px, gap nhỏ hơn
- **Mobile** (480px): 4 ô 50x50px, có thể wrap

## Data Structure

### Prize Data Expected:
```javascript
allPrizes = [
  {
    name: "Prize Name",
    icon: "🎁" or "http://url-to-icon.png", // Ưu tiên
    image: "http://url-to-image.png"        // Fallback
  }
]
```

### Scratch Progress Data:
```javascript
window.scratchCardsData = {
  "ticket123": {
    circles: [
      { canvas, ctx, scratchedAreas: [...] }, // Circle 0
      { canvas, ctx, scratchedAreas: [...] }, // Circle 1
      { canvas, ctx, scratchedAreas: [...] }, // Circle 2
      { canvas, ctx, scratchedAreas: [...] }  // Circle 3
    ],
    scratchedAreas: {
      0: [...], // Circle 0 scratch areas
      1: [...], // Circle 1 scratch areas
      2: [...], // Circle 2 scratch areas
      3: [...]  // Circle 3 scratch areas
    }
  }
}
```

## Features

### ✅ Completed:
1. Product title hiển thị trên đầu card
2. 4 ô tròn scratch trên 1 hàng
3. Logic icon giống nhau (win) vs khác nhau (lose)
4. Danh sách available prizes với icon/image
5. Responsive design cho tất cả screen sizes
6. Individual scratch functionality cho từng ô
7. Save/load progress hoạt động với structure mới

### 🎯 Key Benefits:
- **Better UX**: Clear structure với 3 sections riêng biệt
- **Visual Clarity**: 4 ô tròn dễ nhìn hơn 1 canvas lớn
- **Mobile Friendly**: Responsive design tốt
- **Performance**: Optimized scratch cho từng ô nhỏ
- **Data Integrity**: Icon priority theo yêu cầu

---

## Implementation Complete ✅
Tất cả 5 tasks đã hoàn thành:
1. ✅ Product title & ticket info
2. ✅ 4 ô tròn scratch layout  
3. ✅ Win/lose icon logic
4. ✅ Available prizes list
5. ✅ CSS styling & responsive

New card structure sẵn sàng để sử dụng!
