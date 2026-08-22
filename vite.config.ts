import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },

  build: {
    /*
      Mã build ra `dist/build/`, KHÔNG phải `dist/assets/`.

      `public/assets/models/` được chép nguyên sang `dist/assets/models/`. Nếu
      mã build cũng đổ vào `dist/assets/` thì hai loại file trộn chung một
      thư mục, không đặt được quy tắc cache riêng: file mã có băm tên nên
      cache vĩnh viễn được, còn file model thì không băm, cache vĩnh viễn là
      thay model xong người dùng vẫn thấy model cũ.

      Tách hai thư mục -> `vercel.json` đặt được hai quy tắc khác nhau.
    */
    assetsDir: 'build',

    rollupOptions: {
      output: {
        /*
          Gom cả ngăn xếp 3D vào MỘT chunk.

          Đã thử tách `three` riêng khỏi `@react-three`: không ăn thua, three
          vẫn bị hút vào chunk của r3f vì hai bên dính nhau quá chặt, kết quả
          là một chunk 4 KB mang tên "three" gây hiểu nhầm.

          Gom lại một chunk vẫn được cái lợi chính: sửa mã ứng dụng rồi deploy
          lại thì chunk này giữ nguyên tên băm -> trình duyệt dùng bản đã
          cache, người thử không tải lại ~350 KB mỗi lần.
        */
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (
            id.includes('/three/') ||
            id.includes('three-stdlib') ||
            id.includes('@react-three') ||
            id.includes('postprocessing')
          ) {
            return 'three-stack'
          }
          return 'vendor'
        },
      },
    },
  },
})
