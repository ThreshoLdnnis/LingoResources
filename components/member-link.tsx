import Link from "next/link";
import type { ReactNode } from "react";

export function MemberLink({ id, name, children }: { id?: string; name: string; children: ReactNode }) {
  return id && /^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i.test(id)
    ? <Link className="post-person member-link" href={"/profile/?user=" + id} aria-label={"查看 " + name + " 的个人名片"}>{children}</Link>
    : <div className="post-person">{children}</div>;
}
