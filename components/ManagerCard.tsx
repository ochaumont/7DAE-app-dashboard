import Avatar from "./Avatar";

type Props = {
  name: string;
  email: string;
  roleLabel: string;
};

export default function ManagerCard({ name, email, roleLabel }: Props) {
  return (
    <div className="flex items-center gap-3 border border-border rounded-card p-3">
      <Avatar name={name} seed={email} size={40} />
      <div className="min-w-0">
        <div className="text-sm font-semibold truncate">{name}</div>
        <div className="text-xs text-muted">{roleLabel}</div>
        <div className="text-xs text-muted font-mono truncate">{email}</div>
      </div>
    </div>
  );
}
