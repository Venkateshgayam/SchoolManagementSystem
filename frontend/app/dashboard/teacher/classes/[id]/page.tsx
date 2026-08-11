import ClassDetail from "@/components/dashboard/managers/ClassDetail";

export default function TeacherClassDetailPage({ params }: { params: { id: string } }) {
  return <ClassDetail classId={Number(params.id)} />;
}
