import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Progress } from '../components/ui/progress';
import { Checkbox } from '../components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '../components/ui/radio-group';
import { Label } from '../components/ui/label';
import { GraduationCap, Target, Award, Clock, ArrowRight, ArrowLeft } from 'lucide-react';
import { useApp } from '../context/AppContext';

const LEARNING_GOALS = [
  { id: 'web-dev', label: 'Web Development', icon: '💻' },
  { id: 'data-science', label: 'Data Science', icon: '📊' },
  { id: 'design', label: 'UX/UI Design', icon: '🎨' },
  { id: 'marketing', label: 'Digital Marketing', icon: '📱' },
  { id: 'business', label: 'Business & Finance', icon: '💼' },
  { id: 'cloud', label: 'Cloud Computing', icon: '☁️' },
];

const SKILL_LEVELS = [
  {
    value: 'beginner',
    label: 'Beginner',
    description: "I'm just starting out",
  },
  {
    value: 'intermediate',
    label: 'Intermediate',
    description: 'I have some experience',
  },
  {
    value: 'advanced',
    label: 'Advanced',
    description: "I'm looking to master my skills",
  },
];

const LEARNING_PACES = [
  {
    value: 'casual',
    label: 'Casual learner',
    description: '2-5 hours per week',
  },
  {
    value: 'regular',
    label: 'Regular learner',
    description: '5-10 hours per week',
  },
  {
    value: 'intensive',
    label: 'Intensive learner',
    description: '10+ hours per week',
  },
];

export const OnboardingPage: React.FC = () => {
  const [step, setStep] = useState(1);
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [skillLevel, setSkillLevel] = useState('');
  const [learningPace, setLearningPace] = useState('');
  const { updateUserProfile } = useApp();
  const navigate = useNavigate();

  const progress = (step / 3) * 100;

  const toggleGoal = (goalId: string) => {
    setSelectedGoals(prev =>
      prev.includes(goalId)
        ? prev.filter(id => id !== goalId)
        : [...prev, goalId]
    );
  };

  const handleNext = () => {
    if (step < 3) {
      setStep(step + 1);
    } else {
      // Save onboarding data
      updateUserProfile({
        learningGoals: selectedGoals,
        skillLevel,
        learningPace,
      });
      navigate('/dashboard');
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const canProceed = () => {
    if (step === 1) return selectedGoals.length > 0;
    if (step === 2) return skillLevel !== '';
    if (step === 3) return learningPace !== '';
    return false;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 mb-4">
            <GraduationCap className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl mb-2">Let's personalize your experience</h1>
          <p className="text-gray-600">This will help us recommend the best courses for you</p>
        </div>

        <div className="mb-6">
          <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
            <span>Step {step} of 3</span>
            <span>{Math.round(progress)}% complete</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <Card className="shadow-xl">
          <CardContent className="p-8">
            {step === 1 && (
              <div className="space-y-6">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                    <Target className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-xl">What do you want to learn?</h2>
                    <p className="text-sm text-gray-600">Select all that apply</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {LEARNING_GOALS.map(goal => (
                    <button
                      key={goal.id}
                      onClick={() => toggleGoal(goal.id)}
                      className={`p-4 rounded-lg border-2 transition-all text-left ${
                        selectedGoals.includes(goal.id)
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="text-2xl mb-2">{goal.icon}</div>
                      <div className="font-medium">{goal.label}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                    <Award className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <h2 className="text-xl">What's your skill level?</h2>
                    <p className="text-sm text-gray-600">We'll recommend courses that match your experience</p>
                  </div>
                </div>

                <RadioGroup value={skillLevel} onValueChange={setSkillLevel}>
                  <div className="space-y-3">
                    {SKILL_LEVELS.map(level => (
                      <div
                        key={level.value}
                        className={`flex items-start space-x-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                          skillLevel === level.value
                            ? 'border-purple-600 bg-purple-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => setSkillLevel(level.value)}
                      >
                        <RadioGroupItem value={level.value} id={level.value} className="mt-1" />
                        <Label htmlFor={level.value} className="flex-1 cursor-pointer">
                          <div className="font-medium mb-1">{level.label}</div>
                          <div className="text-sm text-gray-600">{level.description}</div>
                        </Label>
                      </div>
                    ))}
                  </div>
                </RadioGroup>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="w-12 h-12 rounded-full bg-pink-100 flex items-center justify-center">
                    <Clock className="w-6 h-6 text-pink-600" />
                  </div>
                  <div>
                    <h2 className="text-xl">How much time can you dedicate?</h2>
                    <p className="text-sm text-gray-600">Choose a pace that works for your schedule</p>
                  </div>
                </div>

                <RadioGroup value={learningPace} onValueChange={setLearningPace}>
                  <div className="space-y-3">
                    {LEARNING_PACES.map(pace => (
                      <div
                        key={pace.value}
                        className={`flex items-start space-x-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                          learningPace === pace.value
                            ? 'border-pink-600 bg-pink-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => setLearningPace(pace.value)}
                      >
                        <RadioGroupItem value={pace.value} id={pace.value} className="mt-1" />
                        <Label htmlFor={pace.value} className="flex-1 cursor-pointer">
                          <div className="font-medium mb-1">{pace.label}</div>
                          <div className="text-sm text-gray-600">{pace.description}</div>
                        </Label>
                      </div>
                    ))}
                  </div>
                </RadioGroup>
              </div>
            )}

            <div className="flex items-center justify-between mt-8 pt-6 border-t">
              {step > 1 ? (
                <Button variant="outline" onClick={handleBack}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
              ) : (
                <div />
              )}

              <Button onClick={handleNext} disabled={!canProceed()}>
                {step === 3 ? 'Get Started' : 'Continue'}
                {step < 3 && <ArrowRight className="ml-2 h-4 w-4" />}
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="text-center mt-6">
          <button
            onClick={() => navigate('/dashboard')}
            className="text-sm text-gray-600 hover:text-gray-900 underline"
          >
            Skip for now
          </button>
        </div>
      </div>
    </div>
  );
};
