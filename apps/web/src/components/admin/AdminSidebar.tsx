import { LayoutDashboard, Users, Calendar, Trophy, FileText, BookOpen, LogOut, ChevronsUpDown, Building2, Key, UserCircle, Scale, Upload, CheckSquare, Database } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AdminSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  courses: Array<{ id: string; name: string }>;
  selectedCourse: string | null;
  onCourseChange: (courseId: string) => void;
}

const panelItems = [
  { id: 'courses', label: 'Kursy', icon: LayoutDashboard },
  { id: 'codes', label: 'Kody dostępu', icon: Key },
  { id: 'all-students', label: 'Wszyscy studenci', icon: UserCircle },
  { id: 'universities', label: 'Uczelnie', icon: Building2 },
  { id: 'wykazy', label: 'Zarządzaj wykazami', icon: Calendar },
  { id: 'batch-import', label: 'Import wykazu (CSV)', icon: Database },
  { id: 'manual-enrichment', label: 'Wzbogacanie ręczne', icon: Database },
];

const courseItems = [
  { id: 'students', label: 'Studenci', icon: Users },
  { id: 'attendance', label: 'Obecność', icon: Calendar },
  { id: 'grades', label: 'Oceny', icon: Trophy },
  { id: 'grading-scale', label: 'Skala ocen', icon: Scale },
  { id: 'assignments', label: 'Zadania', icon: Upload },
  { id: 'submissions', label: 'Wysłane prace', icon: CheckSquare },
  { id: 'syllabus', label: 'Sylabus', icon: FileText },
  { id: 'literature', label: 'Literatura', icon: BookOpen },
];

export const AdminSidebar = ({ 
  activeTab, 
  onTabChange, 
  courses,
  selectedCourse,
  onCourseChange 
}: AdminSidebarProps) => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast.success('Wylogowano pomyślnie');
      navigate('/login');
    } catch (error) {
      console.error('Error logging out:', error);
      toast.error('Błąd podczas wylogowania');
    }
  };

  return (
    <div className="w-64 h-screen bg-sidebar-background border-r border-sidebar-border flex flex-col">
      {/* Course Selector - Top Section */}
      <div className="border-b border-sidebar-border">
        <Select value={selectedCourse || undefined} onValueChange={onCourseChange}>
          <SelectTrigger className="h-14 w-full rounded-none border-x-0 border-t-0 border-b border-sidebar-border px-3 shadow-none hover:bg-sidebar-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
            <div className="flex grow flex-col items-start overflow-hidden">
              <p className="text-muted-foreground font-mono text-[10px] tracking-wider uppercase">
                KURS
              </p>
              <p className="text-base w-full truncate text-start font-medium text-sidebar-foreground">
                {selectedCourse === 'all' 
                  ? 'Panel główny' 
                  : courses.find(c => c.id === selectedCourse)?.name || 'Wybierz kurs'}
              </p>
            </div>
            <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground" />
          </SelectTrigger>
          <SelectContent className="bg-popover border-border w-60 rounded-2xl">
            <SelectItem value="all">Wszystkie kursy</SelectItem>
            {courses.map((course) => (
              <SelectItem key={course.id} value={course.id}>
                {course.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Navigation */}
      <nav className="flex grow flex-col justify-between gap-y-3 overflow-y-auto pt-3">
        <div className="flex flex-col gap-y-1.5">
          {selectedCourse === 'all' || !selectedCourse ? (
            // Panel view - show general items
            panelItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              
              return (
                <div key={item.id} className="px-2">
                  <button
                    onClick={() => onTabChange(item.id)}
                    className={`
                      focus-visible:ring-ring flex items-center justify-between gap-2.5 
                      rounded-xl px-2 py-2 focus-visible:z-10 focus-visible:outline-none 
                      focus-visible:ring-1 w-full
                      ${isActive 
                        ? 'text-primary bg-surface dark:bg-surface-l2' 
                        : 'text-subtle hover:text-primary hover:bg-surface dark:hover:bg-surface-l2'
                      }
                    `}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className="size-[1.15rem] shrink-0" />
                      <p className="text-sm font-medium text-[inherit]">{item.label}</p>
                    </div>
                  </button>
                </div>
              );
            })
          ) : (
            // Course view - show course-specific items
            courseItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              
              return (
                <div key={item.id} className="px-2">
                  <button
                    onClick={() => onTabChange(item.id)}
                    className={`
                      focus-visible:ring-ring flex items-center justify-between gap-2.5 
                      rounded-xl px-2 py-2 focus-visible:z-10 focus-visible:outline-none 
                      focus-visible:ring-1 w-full
                      ${isActive 
                        ? 'text-primary bg-surface dark:bg-surface-l2' 
                        : 'text-subtle hover:text-primary hover:bg-surface dark:hover:bg-surface-l2'
                      }
                    `}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className="size-[1.15rem] shrink-0" />
                      <p className="text-sm font-medium text-[inherit]">{item.label}</p>
                    </div>
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Bottom Section */}
        <div className="flex flex-col gap-y-1.5 pb-3">
          <div className="px-2">
            <Button
              variant="ghost"
              onClick={handleLogout}
              className="focus-visible:ring-ring flex items-center justify-between gap-2.5 rounded-xl px-2 py-2 focus-visible:z-10 focus-visible:outline-none focus-visible:ring-1 w-full justify-start text-subtle hover:text-primary hover:bg-surface dark:hover:bg-surface-l2"
            >
              <div className="flex items-center gap-2.5">
                <LogOut className="size-[1.15rem] shrink-0" />
                <p className="text-sm font-medium text-[inherit]">Wyloguj</p>
              </div>
            </Button>
          </div>
        </div>
      </nav>
    </div>
  );
};
