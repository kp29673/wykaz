import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { CourseManagement } from '@/components/admin/CourseManagement';
import { StudentManagement } from '@/components/admin/StudentManagement';
import { AttendanceManagement } from '@/components/admin/AttendanceManagement';
import { GradeManagement } from '@/components/admin/GradeManagement';
import { WykazyManagement } from '@/components/admin/WykazyManagement';
import { SyllabusManagement } from '@/components/admin/SyllabusManagement';
import { LiteratureManagement } from '@/components/admin/LiteratureManagement';
import { ResourceCodeManagement } from '@/components/admin/ResourceCodeManagement';
import { UniversityManagement } from '@/components/admin/UniversityManagement';
import GradingScaleManagement from '@/components/admin/GradingScaleManagement';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AssignmentManagement } from '@/components/admin/AssignmentManagement';
import { AssignmentSubmissions } from '@/components/admin/AssignmentSubmissions';
import { BatchImportJournals } from '@/components/admin/BatchImportJournals';
import { ManualEnrichment } from '@/components/admin/ManualEnrichment';
import { toast } from 'sonner';

const AdminPanel = () => {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('courses');
  const [courses, setCourses] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedCourse, setSelectedCourse] = useState<string | null>('all');

  useEffect(() => {
    checkAdminAccess();
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      const { data, error } = await supabase
        .from('courses')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setCourses(data || []);
    } catch (error) {
      console.error('Error fetching courses:', error);
    }
  };

  const checkAdminAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error('Musisz być zalogowany');
        navigate('/login');
        return;
      }

      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .single();

      if (error || !data) {
        toast.error('Brak uprawnień administratora');
        navigate('/');
        return;
      }

      setIsAdmin(true);
    } catch (error) {
      console.error('Error checking admin access:', error);
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Sprawdzanie uprawnień...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <AdminSidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        courses={courses}
        selectedCourse={selectedCourse}
        onCourseChange={setSelectedCourse}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Content Area */}
        <ScrollArea className="flex-1 minimal-scrollbar">
          <div className="p-6">
            {(selectedCourse === 'all' || !selectedCourse) && (
              <>
                {activeTab === 'courses' && <CourseManagement />}
                {activeTab === 'codes' && <ResourceCodeManagement />}
                {activeTab === 'all-students' && <StudentManagement courseId={null} />}
                {activeTab === 'universities' && <UniversityManagement />}
                {activeTab === 'wykazy' && <WykazyManagement />}
                {activeTab === 'batch-import' && <BatchImportJournals />}
                {activeTab === 'manual-enrichment' && <ManualEnrichment />}
              </>
            )}
            
            {selectedCourse && selectedCourse !== 'all' && (
              <>
                {activeTab === 'students' && <StudentManagement courseId={selectedCourse} />}
                {activeTab === 'attendance' && <AttendanceManagement courseId={selectedCourse} />}
                {activeTab === 'grades' && <GradeManagement courseId={selectedCourse} />}
                {activeTab === 'grading-scale' && <GradingScaleManagement courseId={selectedCourse} />}
                {activeTab === 'assignments' && <AssignmentManagement courseId={selectedCourse} />}
                {activeTab === 'submissions' && <AssignmentSubmissions courseId={selectedCourse} />}
                {activeTab === 'syllabus' && <SyllabusManagement courseId={selectedCourse} />}
                {activeTab === 'literature' && <LiteratureManagement courseId={selectedCourse} />}
              </>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};

export default AdminPanel;
