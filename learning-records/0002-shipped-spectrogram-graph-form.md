# ส่งของจริง: เพิ่มโหมด Spectrogram (mission ข้อ "graph form ใหม่")

หลังเรียนบท 1–5 ผู้เรียนเลือกลงมือทำของจริง — เพิ่ม **graph form ใหม่ "Spectrogram" (mode 4)** ลง Faunaform จริง ตอบ mission ข้อ "ออกแบบ graph form แบบใหม่"

**สิ่งที่ทำ**: เพิ่ม `js/render3d/spectrogram.js` (DataTexture เลื่อนแบบ ring-buffer: ความถี่=Y, เวลา=X เลื่อนซ้าย, ความดัง=สีตาม gradient เดียวกับ bar forms) แล้ว wire เข้า `modes.js` (mode 4 = spectrogram, signatures เลื่อนไป mode 5), `render3d.js`, `main.js` (render branch + mic-prompt/placeholder gating), `controls.js` (กด 5), help ใน `index.html`. unit test เดิม 23/23 ผ่าน

**ผลต่อการสอน**: ผู้เรียนข้ามจาก "เข้าใจ" ไป "ส่งของ" ได้แล้ว แนวทางต่อไปควรเป็นงานแก้โค้ดจริงแบบนี้มากขึ้น ทางที่ยังเปิดอยู่: (ข) เอา features มาคิด `signatureDistance` (จากบท 5), (ค) เจาะสเกลเดซิเบล ดู [[MISSION.md]] · ยังไม่ได้ commit โค้ดฟีเจอร์นี้ (รอผู้เรียนสั่ง)

**ค้าง**: ยังต้องให้ผู้เรียนยืนยันด้วยตา (กด 4 ในเบราว์เซอร์) ว่า spectrogram วาดถูกต้อง
