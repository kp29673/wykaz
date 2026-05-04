import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Search, FileText, Download, ChevronRight, Menu, X, BookOpen, FileCode, Award, ClipboardList } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CourseAssignments } from '@/components/course/CourseAssignments';
import DOMPurify from 'dompurify';

interface Course {
  id: string;
  name: string;
  description: string;
  field_of_study: string;
}

interface Material {
  id: string;
  title: string;
  description: string;
  file_url: string;
  file_type: string;
  order_index: number;
}

interface Literature {
  id: string;
  type: 'BASIC' | 'SUPPLEMENTARY';
  title: string;
  authors: string | null;
  year: number | null;
  publisher: string | null;
  isbn: string | null;
  doi: string | null;
  url: string | null;
  cover_url: string | null;
  item_category: 'BOOK' | 'ARTICLE' | 'LEGAL_ACT' | null;
  legal_act_data: any | null;
}

interface Syllabus {
  content_rich_text: string | null;
  updated_at: string;
}

interface StudentGrade {
  points: number | null;
  grade: string | null;
  notes: string | null;
  grade_items: {
    name: string;
    max_points: number;
    weight: number;
  };
}

interface GradingScale {
  id: string;
  grade: string;
  min_percentage: number;
  max_percentage: number;
}

interface Assignment {
  id: string;
  title: string;
  description: string | null;
  deadline: string;
  max_points: number;
  created_at: string;
}

const CourseDashboard = () => {
  const { courseCode } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState<Course | null>(null);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [literature, setLiterature] = useState<Literature[]>([]);
  const [syllabus, setSyllabus] = useState<Syllabus | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [indexNumber, setIndexNumber] = useState('');
  const [studentGrades, setStudentGrades] = useState<StudentGrade[]>([]);
  const [gradingScales, setGradingScales] = useState<GradingScale[]>([]);
  const [studentInfo, setStudentInfo] = useState<{ first_name: string; last_name: string } | null>(null);
  const [loadingGrades, setLoadingGrades] = useState(false);
  const [assignments, setAssignments] = useState<Assignment[]>([]);

  useEffect(() => {
    fetchCourseData();
  }, [courseCode]);

  const fetchCourseData = async () => {
    try {
      const { data: courseData, error: courseError } = await supabase
        .from('courses')
        .select('*')
        .eq('code', courseCode)
        .single();

      if (courseError || !courseData) {
        toast.error('Nie znaleziono kursu');
        navigate('/student-resources');
        return;
      }

      setCourse(courseData);

      // Fetch materials
      const { data: materialsData, error: materialsError } = await supabase
        .from('course_materials')
        .select('*')
        .eq('course_id', courseData.id)
        .order('order_index', { ascending: true });

      if (materialsError) throw materialsError;
      setMaterials(materialsData || []);

      // Fetch literature
      const { data: literatureData, error: literatureError } = await supabase
        .from('literature_items')
        .select('*')
        .eq('course_id', courseData.id)
        .order('title');

      if (literatureError) throw literatureError;
      setLiterature((literatureData || []) as Literature[]);

      // Fetch syllabus
      const { data: syllabusData, error: syllabusError } = await supabase
        .from('syllabus')
        .select('*')
        .eq('course_id', courseData.id)
        .maybeSingle();

      if (syllabusError) throw syllabusError;
      setSyllabus(syllabusData);

      // Fetch grading scales
      const { data: scalesData, error: scalesError } = await supabase
        .from('grading_scales')
        .select('*')
        .eq('course_id', courseData.id)
        .order('min_percentage');

      if (scalesError) throw scalesError;
      setGradingScales(scalesData || []);

      // Fetch assignments
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('assignments')
        .select('*')
        .eq('course_id', courseData.id)
        .order('deadline', { ascending: true });

      if (assignmentsError) throw assignmentsError;
      setAssignments(assignmentsData || []);

    } catch (error) {
      console.error('Error fetching course data:', error);
      toast.error('Błąd pobierania danych kursu');
    } finally {
      setLoading(false);
    }
  };

  const filteredMaterials = materials.filter(material =>
    material.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    material.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredLiterature = literature.filter(item =>
    item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.authors?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const searchSuggestions = searchQuery.trim() ? [
    ...filteredMaterials.slice(0, 3).map(m => ({ type: 'material' as const, item: m })),
    ...filteredLiterature.slice(0, 2).map(l => ({ type: 'literature' as const, item: l }))
  ] : [];

  const basicLiterature = literature.filter(item => item.type === 'BASIC');
  const supplementaryLiterature = literature.filter(item => item.type === 'SUPPLEMENTARY');

  const handleCheckGrades = async () => {
    if (!indexNumber.trim() || !course) {
      toast.error('Wprowadź numer indeksu');
      return;
    }

    setLoadingGrades(true);
    try {
      // Fetch grading scales
      const { data: scalesData, error: scalesError } = await supabase
        .from('grading_scales')
        .select('*')
        .eq('course_id', course.id)
        .order('min_percentage');

      if (scalesError) throw scalesError;
      setGradingScales(scalesData || []);

      // Fetch student data
      const { data: studentData, error: studentError } = await supabase
        .from('students')
        .select('id, first_name, last_name')
        .eq('index_number', indexNumber.trim())
        .eq('course_id', course.id)
        .maybeSingle();

      if (studentError || !studentData) {
        toast.error('Nie znaleziono studenta o podanym numerze indeksu');
        setStudentGrades([]);
        setStudentInfo(null);
        return;
      }

      setStudentInfo({ first_name: studentData.first_name, last_name: studentData.last_name });

      // Fetch grades
      const { data: gradesData, error: gradesError } = await supabase
        .from('grade_records')
        .select(`
          points,
          grade,
          notes,
          grade_items (
            name,
            max_points,
            weight
          )
        `)
        .eq('student_id', studentData.id);

      if (gradesError) throw gradesError;

      setStudentGrades(gradesData || []);
      
      if (!gradesData || gradesData.length === 0) {
        toast.info('Brak ocen dla tego studenta');
      } else {
        toast.success('Załadowano oceny');
      }
    } catch (error) {
      console.error('Error fetching grades:', error);
      toast.error('Błąd pobierania ocen');
    } finally {
      setLoadingGrades(false);
    }
  };

  const calculateLetterGrade = (percentage: number): string | null => {
    if (gradingScales.length === 0) return null;
    
    const scale = gradingScales.find(
      s => percentage >= s.min_percentage && percentage <= s.max_percentage
    );
    
    return scale?.grade || null;
  };

  const calculateFinalGrade = () => {
    if (studentGrades.length === 0) return null;

    let totalWeightedPoints = 0;
    let totalWeight = 0;

    studentGrades.forEach((record) => {
      if (record.points !== null && record.grade_items) {
        const percentage = (record.points / record.grade_items.max_points) * 100;
        const weightedScore = (percentage * record.grade_items.weight) / 100;
        totalWeightedPoints += weightedScore;
        totalWeight += record.grade_items.weight;
      }
    });

    if (totalWeight === 0) return null;

    return ((totalWeightedPoints / totalWeight) * 100).toFixed(2);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Ładowanie kursu...</p>
        </div>
      </div>
    );
  }

  if (!course) return null;

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {/* Sidebar */}
      <aside
        className={cn(
          "border-r border-border bg-background transition-all duration-300 flex flex-col",
          sidebarOpen ? "w-80" : "w-0"
        )}
      >
        {sidebarOpen && (
          <div className="flex flex-col h-full overflow-hidden">
            {/* Sidebar Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/student-resources')}
                className="hover:bg-accent"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Wstecz
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarOpen(false)}
                className="lg:hidden"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Course Info */}
            <div className="px-6 py-4 border-b border-border">
              <h2 className="font-semibold text-sm mb-1">{course.name}</h2>
              <p className="text-xs text-muted-foreground">{course.field_of_study}</p>
            </div>

            {/* Navigation */}
            <div className="flex-1 overflow-y-auto minimal-scrollbar">
              <div className="px-4 py-4">
                <div className="space-y-1">
                  <button
                    onClick={() => {
                      setActiveTab('overview');
                      setSelectedMaterial(null);
                    }}
                    className={cn(
                      "w-full text-left px-3 py-2 rounded-md text-sm transition-colors nav-item",
                      activeTab === 'overview' && !selectedMaterial && "active"
                    )}
                  >
                    Przegląd
                  </button>

                  <button
                    onClick={() => setActiveTab('syllabus')}
                    className={cn(
                      "w-full text-left px-3 py-2 rounded-md text-sm transition-colors nav-item flex items-center gap-2",
                      activeTab === 'syllabus' && "active"
                    )}
                  >
                    <FileCode className="h-4 w-4" />
                    Sylabus
                  </button>

                  <button
                    onClick={() => setActiveTab('literature')}
                    className={cn(
                      "w-full text-left px-3 py-2 rounded-md text-sm transition-colors nav-item flex items-center gap-2",
                      activeTab === 'literature' && "active"
                    )}
                  >
                    <BookOpen className="h-4 w-4" />
                    Literatura
                  </button>

                  <button
                    onClick={() => setActiveTab('grades')}
                    className={cn(
                      "w-full text-left px-3 py-2 rounded-md text-sm transition-colors nav-item flex items-center gap-2",
                      activeTab === 'grades' && "active"
                    )}
                  >
                    <Award className="h-4 w-4" />
                    Oceny
                  </button>

                  <button
                    onClick={() => setActiveTab('assignments')}
                    className={cn(
                      "w-full text-left px-3 py-2 rounded-md text-sm transition-colors nav-item flex items-center gap-2",
                      activeTab === 'assignments' && "active"
                    )}
                  >
                    <ClipboardList className="h-4 w-4" />
                    Zadania {assignments.length > 0 && `(${assignments.length})`}
                  </button>

                  {materials.length > 0 && (
                    <>
                      <div className="pt-4 pb-2 px-3">
                        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          Materiały
                        </h3>
                      </div>
                      {filteredMaterials.map((material) => (
                        <button
                          key={material.id}
                          onClick={() => {
                            setSelectedMaterial(material);
                            setActiveTab('materials');
                          }}
                          className={cn(
                            "w-full text-left px-3 py-2 rounded-md text-sm transition-colors nav-item",
                            selectedMaterial?.id === material.id && activeTab === 'materials' && "active"
                          )}
                        >
                          {material.title}
                        </button>
                      ))}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="border-b border-border bg-background">
          <div className="flex items-center justify-between px-6 py-3">
            <div className="flex items-center gap-4 flex-1">
              {!sidebarOpen && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSidebarOpen(true)}
                >
                  <Menu className="h-5 w-5" />
                </Button>
              )}
              
              <div className="relative max-w-md w-full">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
                <Input
                  placeholder="Szukaj w kursie..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setShowSearchSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSearchSuggestions(false), 200)}
                  className="pl-10 bg-muted/50 border-border"
                />
                
                {showSearchSuggestions && searchQuery && searchSuggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-md shadow-lg z-50 max-h-80 overflow-y-auto">
                    {searchSuggestions.map((suggestion, idx) => (
                      <button
                        key={idx}
                        className="w-full text-left px-4 py-3 hover:bg-accent transition-colors border-b border-border last:border-b-0"
                        onClick={() => {
                          if (suggestion.type === 'material') {
                            setSelectedMaterial(suggestion.item);
                            setActiveTab('materials');
                          } else {
                            setActiveTab('literature');
                          }
                          setSearchQuery('');
                          setShowSearchSuggestions(false);
                        }}
                      >
                        <div className="flex items-start gap-3">
                          {suggestion.type === 'material' ? (
                            <FileText className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                          ) : (
                            <BookOpen className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{suggestion.item.title}</p>
                            {suggestion.type === 'material' && suggestion.item.description && (
                              <p className="text-xs text-muted-foreground truncate">{suggestion.item.description}</p>
                            )}
                            {suggestion.type === 'literature' && suggestion.item.authors && (
                              <p className="text-xs text-muted-foreground truncate">{suggestion.item.authors}</p>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <ThemeToggle />
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto minimal-scrollbar">
          <div className="max-w-4xl mx-auto px-8 py-12">
            {activeTab === 'overview' && !selectedMaterial && (
              // Overview
              <div className="space-y-8">
                <div>
                  <h1 className="text-4xl font-bold mb-2">{course.name}</h1>
                  <p className="text-muted-foreground">{course.field_of_study}</p>
                </div>

                {course.description && (
                  <div>
                    <h2 className="text-2xl font-semibold mb-4">O kursie</h2>
                    <p className="text-muted-foreground leading-relaxed">{course.description}</p>
                  </div>
                )}

                {materials.length > 0 && (
                  <div>
                    <h2 className="text-2xl font-semibold mb-6">Zacznij tutaj</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {materials.slice(0, 3).map((material) => (
                        <Card
                          key={material.id}
                          className="cursor-pointer hover:bg-accent/50 transition-colors border border-border"
                          onClick={() => {
                            setSelectedMaterial(material);
                            setActiveTab('materials');
                          }}
                        >
                          <div className="p-6">
                            <div className="flex items-center justify-between mb-4">
                              <FileText className="h-8 w-8 text-muted-foreground" />
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <h3 className="font-semibold mb-2">{material.title}</h3>
                            {material.description && (
                              <p className="text-sm text-muted-foreground line-clamp-2">
                                {material.description}
                              </p>
                            )}
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'syllabus' && (
              <div className="space-y-6">
                <div>
                  <h1 className="text-4xl font-bold mb-2">Sylabus</h1>
                  <p className="text-muted-foreground">{course.name}</p>
                </div>

                {syllabus?.content_rich_text ? (
                  <Card className="dashboard-card p-8">
                    <div 
                      className="prose prose-neutral dark:prose-invert max-w-none"
                      dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(syllabus.content_rich_text) }}
                    />
                  </Card>
                ) : (
                  <Card className="dashboard-card p-12 text-center">
                    <FileCode className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">Sylabus nie jest jeszcze dostępny</p>
                  </Card>
                )}
              </div>
            )}

            {activeTab === 'literature' && (
              <div className="space-y-6">
                <div>
                  <h1 className="text-4xl font-bold mb-2">Literatura</h1>
                  <p className="text-muted-foreground">{course.name}</p>
                </div>

                <Tabs defaultValue="basic" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="basic">Podstawowa ({basicLiterature.length})</TabsTrigger>
                    <TabsTrigger value="supplementary">Uzupełniająca ({supplementaryLiterature.length})</TabsTrigger>
                  </TabsList>

                  <TabsContent value="basic" className="space-y-4 mt-6">
                    {basicLiterature.length === 0 ? (
                      <Card className="dashboard-card p-12 text-center">
                        <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">Brak literatury podstawowej</p>
                      </Card>
                    ) : (
                      basicLiterature.map((item) => (
                        <Card key={item.id} className="dashboard-card p-6">
                          <div className="flex gap-4">
                            {item.cover_url ? (
                              <img src={item.cover_url} alt={item.title} className="w-24 h-36 object-cover rounded flex-shrink-0 shadow-md" />
                            ) : (
                              <div className="w-24 h-36 bg-gradient-to-br from-muted to-muted/50 rounded flex-shrink-0 flex flex-col items-center justify-center p-2 shadow-md">
                                <BookOpen className="h-8 w-8 text-muted-foreground mb-2" />
                                <p className="text-[10px] text-center text-muted-foreground leading-tight">{item.title}</p>
                              </div>
                            )}
                            <div className="flex-1">
                              <div className="flex items-start gap-2 mb-2">
                                {item.item_category === 'LEGAL_ACT' && <span className="text-xs bg-blue-500/10 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded font-medium border border-blue-200 dark:border-blue-800">⚖️ Ustawa</span>}
                                {item.item_category === 'ARTICLE' && <span className="text-xs bg-green-500/10 text-green-700 dark:text-green-300 px-2 py-0.5 rounded font-medium border border-green-200 dark:border-green-800">📄 Artykuł</span>}
                                {item.item_category === 'BOOK' && <span className="text-xs bg-orange-500/10 text-orange-700 dark:text-orange-300 px-2 py-0.5 rounded font-medium border border-orange-200 dark:border-orange-800">📚 Książka</span>}
                              </div>
                              <h4 className="font-semibold text-lg mb-2">{item.title}</h4>
                              {item.authors && <p className="text-muted-foreground mb-2">{item.authors}</p>}
                              <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                                {item.year && <span>Rok: {item.year}</span>}
                                {item.publisher && <span>Wydawca: {item.publisher}</span>}
                                {item.isbn && <span>ISBN: {item.isbn}</span>}
                                {item.doi && <span>DOI: {item.doi}</span>}
                              </div>
                              {item.legal_act_data && (
                                <p className="text-sm text-muted-foreground mt-2">
                                  Dz.U. {item.legal_act_data.journal_year} Nr {item.legal_act_data.journal_number} poz. {item.legal_act_data.journal_position}
                                </p>
                              )}
                              {item.url && (
                                <a 
                                  href={item.url} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  className="text-primary hover:underline mt-3 inline-block"
                                >
                                  Link do źródła →
                                </a>
                              )}
                            </div>
                          </div>
                        </Card>
                      ))
                    )}
                  </TabsContent>

                  <TabsContent value="supplementary" className="space-y-4 mt-6">
                    {supplementaryLiterature.length === 0 ? (
                      <Card className="dashboard-card p-12 text-center">
                        <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">Brak literatury uzupełniającej</p>
                      </Card>
                    ) : (
                      supplementaryLiterature.map((item) => (
                        <Card key={item.id} className="dashboard-card p-6">
                          <div className="flex gap-4">
                            {item.cover_url ? (
                              <img src={item.cover_url} alt={item.title} className="w-24 h-36 object-cover rounded flex-shrink-0 shadow-md" />
                            ) : (
                              <div className="w-24 h-36 bg-gradient-to-br from-muted to-muted/50 rounded flex-shrink-0 flex flex-col items-center justify-center p-2 shadow-md">
                                <BookOpen className="h-8 w-8 text-muted-foreground mb-2" />
                                <p className="text-[10px] text-center text-muted-foreground leading-tight">{item.title}</p>
                              </div>
                            )}
                            <div className="flex-1">
                              <div className="flex items-start gap-2 mb-2">
                                {item.item_category === 'LEGAL_ACT' && <span className="text-xs bg-blue-500/10 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded font-medium border border-blue-200 dark:border-blue-800">⚖️ Ustawa</span>}
                                {item.item_category === 'ARTICLE' && <span className="text-xs bg-green-500/10 text-green-700 dark:text-green-300 px-2 py-0.5 rounded font-medium border border-green-200 dark:border-green-800">📄 Artykuł</span>}
                                {item.item_category === 'BOOK' && <span className="text-xs bg-orange-500/10 text-orange-700 dark:text-orange-300 px-2 py-0.5 rounded font-medium border border-orange-200 dark:border-orange-800">📚 Książka</span>}
                              </div>
                              <h4 className="font-semibold text-lg mb-2">{item.title}</h4>
                              {item.authors && <p className="text-muted-foreground mb-2">{item.authors}</p>}
                              <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                                {item.year && <span>Rok: {item.year}</span>}
                                {item.publisher && <span>Wydawca: {item.publisher}</span>}
                                {item.isbn && <span>ISBN: {item.isbn}</span>}
                                {item.doi && <span>DOI: {item.doi}</span>}
                              </div>
                              {item.legal_act_data && (
                                <p className="text-sm text-muted-foreground mt-2">
                                  Dz.U. {item.legal_act_data.journal_year} Nr {item.legal_act_data.journal_number} poz. {item.legal_act_data.journal_position}
                                </p>
                              )}
                              {item.url && (
                                <a 
                                  href={item.url} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  className="text-primary hover:underline mt-3 inline-block"
                                >
                                  Link do źródła →
                                </a>
                              )}
                            </div>
                          </div>
                        </Card>
                      ))
                    )}
                  </TabsContent>
                </Tabs>
              </div>
            )}

            {activeTab === 'materials' && selectedMaterial && (
              // Material Detail
              <div className="space-y-6">
                <div>
                  <h1 className="text-4xl font-bold mb-4">{selectedMaterial.title}</h1>
                  {selectedMaterial.description && (
                    <p className="text-lg text-muted-foreground leading-relaxed">
                      {selectedMaterial.description}
                    </p>
                  )}
                </div>

                {selectedMaterial.file_url && (
                  <Card className="border border-border">
                    <div className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="p-3 bg-muted rounded-lg">
                            <FileText className="h-6 w-6" />
                          </div>
                          <div>
                            <h3 className="font-semibold mb-1">Pobierz materiał</h3>
                            <p className="text-sm text-muted-foreground">
                              Typ: {selectedMaterial.file_type || 'Dokument'}
                            </p>
                          </div>
                        </div>
                        <Button
                          onClick={() => window.open(selectedMaterial.file_url, '_blank')}
                          className="gap-2"
                        >
                          <Download className="h-4 w-4" />
                          Pobierz
                        </Button>
                      </div>
                    </div>
                  </Card>
                )}
              </div>
            )}

            {activeTab === 'assignments' && (
              <div className="space-y-6">
                <div>
                  <h1 className="text-4xl font-bold mb-2">Zadania</h1>
                  <p className="text-muted-foreground">{course.name}</p>
                </div>

                <CourseAssignments
                  assignments={assignments}
                  courseId={course.id}
                  courseName={course.name}
                />
              </div>
            )}

            {activeTab === 'grades' && (
              <div className="space-y-6">
                <div>
                  <h1 className="text-4xl font-bold mb-2">Oceny</h1>
                  <p className="text-muted-foreground">{course.name}</p>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>Skala ocen</CardTitle>
                    <CardDescription>
                      Poniżej znajduje się obowiązująca skala ocen dla tego kursu
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {gradingScales.length > 0 ? (
                      <div className="space-y-2">
                        {gradingScales
                          .sort((a, b) => Number(b.grade) - Number(a.grade))
                          .map((scale) => (
                            <div
                              key={scale.id}
                              className="flex items-center justify-between p-3 rounded-lg border bg-card"
                            >
                              <span className="font-semibold text-lg">{scale.grade}</span>
                              <span className="text-muted-foreground">
                                {scale.min_percentage}% - {scale.max_percentage}%
                              </span>
                            </div>
                          ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Skala ocen nie została jeszcze zdefiniowana dla tego kursu.
                      </p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Sprawdź swoje oceny</CardTitle>
                    <CardDescription>
                      Wprowadź swój numer indeksu, aby sprawdzić oceny
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex gap-4">
                      <Input
                        placeholder="Numer indeksu"
                        value={indexNumber}
                        onChange={(e) => setIndexNumber(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleCheckGrades()}
                        disabled={loadingGrades}
                      />
                      <Button onClick={handleCheckGrades} disabled={loadingGrades || !indexNumber.trim()}>
                        {loadingGrades ? 'Ładowanie...' : 'Sprawdź ocenę'}
                      </Button>
                    </div>

                    {studentInfo && studentGrades.length > 0 && (
                      <div className="space-y-3 mt-6">
                        {studentGrades.map((record, index) => (
                          <div key={index} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border">
                            <div className="flex-1">
                              <p className="font-medium">{record.grade_items.name}</p>
                              {record.notes && (
                                <p className="text-sm text-muted-foreground mt-1">{record.notes}</p>
                              )}
                            </div>
                            <div className="text-right">
                              <div className="flex items-center gap-3">
                                <div>
                                  <p className="font-semibold text-lg">
                                    {record.points !== null ? `${record.points}/${record.grade_items.max_points}` : '-'}
                                  </p>
                                  <p className="text-sm text-muted-foreground">
                                    waga: {record.grade_items.weight}%
                                  </p>
                                </div>
                                {record.grade && (
                                  <div className="text-2xl font-bold text-primary">
                                    {record.grade}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                        
                        {calculateFinalGrade() && calculateLetterGrade(parseFloat(calculateFinalGrade()!)) && (
                          <div className="mt-6 p-6 bg-primary/10 rounded-lg border-2 border-primary/20">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm text-muted-foreground mb-1">Ostateczna ocena</p>
                                <p className="text-4xl font-bold text-primary">
                                  {calculateLetterGrade(parseFloat(calculateFinalGrade()!))}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm text-muted-foreground">Wynik procentowy</p>
                                <p className="text-2xl font-semibold">
                                  {calculateFinalGrade()}%
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {studentInfo && studentGrades.length === 0 && (
                      <div className="text-center py-8">
                        <Award className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                        <p className="text-muted-foreground">Brak ocen dla tego studenta</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default CourseDashboard;
