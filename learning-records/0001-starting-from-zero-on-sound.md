# เริ่มจากศูนย์ด้านทฤษฎีเสียง แต่เขียนโค้ดเป็น

ผู้เรียนระบุว่า **ไม่รู้อะไรเลยเกี่ยวกับทฤษฎีเสียง** (frequency, amplitude, FFT, spectrogram) แต่ *เขียนโปรแกรมและใช้ Web Audio API เป็นแล้ว* — โค้ด Faunaform (`js/audio.js`) ใช้ `AnalyserNode`, `fftSize`, `getByteTimeDomainData`/`getByteFrequencyData` ได้ทำงานจริง

**ผลต่อการสอน**: เริ่มจากฟิสิกส์พื้นฐานของเสียง แต่ยึดกับโค้ดที่เขาเขียนเองเสมอ (เขาอ่านโค้ดออก ไม่ต้องสอน syntax) ทุกบทต้องมี hands-on. ต้องการครบทั้ง: เข้าใจพารามิเตอร์ + แยก signature สัตว์ + สร้าง graph form ใหม่ — แต่จัดลำดับ ZPD ทีละก้าว

**Evidence**: ตอบคำถาม mission ข้อ 3 ว่า "I don't know anything about sound" และข้อ 4 "coding while learning"

**ลำดับที่วางไว้**: บท 1 = time domain / amplitude (`timeData`) → บท 2 = frequency domain / FFT (`frequencyData`) → บท 3 = spectrogram → ต่อไป signature เสียงสัตว์ ดู [[MISSION.md]]
