export const id = {
  lang: 'id',
  locale: 'id_ID',
  meta: {
    title: 'Lumost — observability dengan data di Indonesia, tagihan per host',
    description: 'Trace, metric, log, dan service map dalam satu konsol. Data tetap di Indonesia, tagihan per host dalam rupiah. Gratis 90 hari untuk tim pertama.',
  },
  contact: {
    form: {
      name: 'Nama',
      email: 'Email kerja',
      company: 'Perusahaan',
      hosts: 'Kira-kira berapa host?',
      hostOptions: ['Belum tahu', 'Kurang dari 10', '10–50', 'Lebih dari 50'],
      message: 'Yang ingin Anda pantau atau selesaikan',
      messagePlaceholder: 'Mis. checkout kami sering lambat dan kami belum tahu sebabnya.',
      submit: 'Kirim',
      sending: 'Mengirim…',
      sent: 'Terima kasih, pesan Anda sudah masuk. Kami balas secepatnya.',
      mailtoHint: 'Aplikasi email Anda akan terbuka dengan pesan yang sudah terisi. Tinggal tekan kirim.',
      error: 'Pesan belum terkirim. Silakan coba lagi, atau hubungi kami lewat WhatsApp atau email.',
      subject: 'Lumost — permintaan demo',
      required: 'wajib diisi',
    },
  },
} as const;

export type Dict = typeof id;
