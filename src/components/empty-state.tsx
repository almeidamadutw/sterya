import { Icon } from '@/components/icon';
export function EmptyState({ icon = 'box', title, text }: { icon?: string; title: string; text: string }) { return <div className="empty-state"><span className="empty-icon"><Icon name={icon} size={27} /></span><h3>{title}</h3><p>{text}</p></div>; }
