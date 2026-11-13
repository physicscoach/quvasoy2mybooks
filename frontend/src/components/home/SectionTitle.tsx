/** Bookly bo'lim sarlavhasi: markazda ingichka ramkadagi yozuv, ikki yonidan
 *  gorizontal chiziq o'tadi. Barcha bo'limlarda bir xil. */
export function SectionTitle({ children, id }: { children: React.ReactNode; id?: string }) {
  return (
    <h2 id={id} className="bolim-sarlavha">
      <span>{children}</span>
    </h2>
  );
}
