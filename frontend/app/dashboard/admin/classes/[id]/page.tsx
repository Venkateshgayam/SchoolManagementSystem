import ClassDetail from "@/components/dashboard/managers/ClassDetail";

export default function AdminClassDetailPage({ params }: { params: { id: string } }) {
  return <ClassDetail classId={Number(params.id)} />;
}
