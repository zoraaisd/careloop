import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { Navbar } from '@/components/common/Navbar';
import { doctorSpecializations } from '@/constants/doctorSpecializations';
import {
  getPublicClinics,
  matchesClinicCategory,
  matchesClinicSearch,
  type ClinicCategory,
  type PublicClinic,
} from '@/services/public-clinics';

import { ClinicsSection } from './sections/ClinicsSection';
import { FeaturesSection } from './sections/FeaturesSection';
import { FooterSection } from './sections/FooterSection';
import { HeroSection } from './sections/HeroSection';
import { HowItWorksSection } from './sections/HowItWorksSection';
import { PlatformShowcaseSection } from './sections/PlatformShowcaseSection';
import { SpecialtiesSection } from './sections/SpecialtiesSection';

const locationOptions = ['All Locations', 'Chennai', 'Bangalore', 'Hyderabad', 'Mumbai', 'Delhi'];
const featuredSpecializations = ['Dermatologist', 'Pediatrician', 'Gynecologist'];

const LandingPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [clinics, setClinics] = useState<PublicClinic[]>([]);
  const [search, setSearch] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('All Locations');
  const [selectedSpecialization, setSelectedSpecialization] = useState('');
  const [showMoreSpecializations, setShowMoreSpecializations] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<ClinicCategory>('All Clinics');
  const [isLoadingClinics, setIsLoadingClinics] = useState(true);
  const [clinicLoadError, setClinicLoadError] = useState('');
  const [footerEmail, setFooterEmail] = useState('');
  const specializationsRef = useRef<HTMLDivElement | null>(null);

  const getCategoryFromSpecialization = (value: string): ClinicCategory =>
    value === 'Dermatologist'
      ? 'Dermatology'
      : value === 'Pediatrician'
        ? 'Pediatric'
        : value === 'Gynecologist'
          ? 'Gynecology'
          : value === 'Cardiologist'
            ? 'Cardiology'
            : value
              ? 'Other'
              : 'All Clinics';

  const getSpecializationFromCategory = (category: ClinicCategory): string =>
    category === 'Dermatology'
      ? 'Dermatologist'
      : category === 'Pediatric'
        ? 'Pediatrician'
        : category === 'Gynecology'
          ? 'Gynecologist'
          : category === 'Cardiology'
            ? 'Cardiologist'
            : category === 'All Clinics'
              ? ''
              : 'Other';

  useEffect(() => {
    const loadClinics = async () => {
      setIsLoadingClinics(true);
      setClinicLoadError('');
      try {
        const response = await getPublicClinics();
        setClinics(response);
      } catch {
        setClinics([]);
        setClinicLoadError('Unable to load clinics right now.');
      } finally {
        setIsLoadingClinics(false);
      }
    };

    void loadClinics();
  }, []);

  const filteredClinics = clinics.filter((clinic) => {
    const locationMatches =
      selectedLocation === 'All Locations' ||
      !selectedLocation ||
      (clinic.city || '').toLowerCase() === selectedLocation.toLowerCase();

    return (
      matchesClinicCategory(clinic, selectedCategory) &&
      locationMatches &&
      matchesClinicSearch(clinic, search)
    );
  });
  const remainingSpecializations = doctorSpecializations.filter(
    (specialization) => !featuredSpecializations.includes(specialization),
  );

  const scrollToClinicCards = () => {
    document.getElementById('clinic-cards-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleClinicSearchSubmit = (event?: React.FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    scrollToClinicCards();
  };

  const handleSpecializationSelect = (value: string) => {
    setSelectedSpecialization(value);
    setSelectedCategory(getCategoryFromSpecialization(value));
    scrollToClinicCards();
  };

  const handleClinicCategorySelect = (category: ClinicCategory) => {
    setSelectedCategory(category);
    setSelectedSpecialization(getSpecializationFromCategory(category));
    scrollToClinicCards();
  };

  useEffect(() => {
    if (!showMoreSpecializations) {
      return;
    }

    const handleOutsideClick = (event: MouseEvent) => {
      if (!specializationsRef.current?.contains(event.target as Node)) {
        setShowMoreSpecializations(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [showMoreSpecializations]);

  useEffect(() => {
    if (!location.hash) {
      return;
    }

    const targetId = location.hash.replace('#', '');
    const timer = window.setTimeout(() => {
      document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 0);

    return () => window.clearTimeout(timer);
  }, [location.hash]);

  return (
    <div className="min-h-screen">
      <Navbar />

      <main id="home-section">
        <HeroSection
          featuredSpecializations={featuredSpecializations}
          handleDoctorSearchSubmit={handleClinicSearchSubmit}
          handleSpecializationSelect={handleSpecializationSelect}
          locationOptions={locationOptions}
          remainingSpecializations={remainingSpecializations}
          search={search}
          selectedLocation={selectedLocation}
          selectedSpecialization={selectedSpecialization}
          setSearch={setSearch}
          setSelectedLocation={setSelectedLocation}
          setShowMoreSpecializations={setShowMoreSpecializations}
          showMoreSpecializations={showMoreSpecializations}
          specializationsRef={specializationsRef}
        />
        <PlatformShowcaseSection />
        <HowItWorksSection />
        <SpecialtiesSection onSelectSpecialization={handleSpecializationSelect} />
        <ClinicsSection
          clinicLoadError={clinicLoadError}
          filteredClinics={filteredClinics}
          handleClinicSearchSubmit={handleClinicSearchSubmit}
          isLoadingClinics={isLoadingClinics}
          onCategorySelect={handleClinicCategorySelect}
          search={search}
          selectedCategory={selectedCategory}
          setSearch={setSearch}
        />
        <FeaturesSection />
      </main>

      <FooterSection
        footerEmail={footerEmail}
        onFooterEmailChange={setFooterEmail}
        onSignupClick={() => navigate('/signup', { state: { initialEmail: footerEmail } })}
      />
    </div>
  );
};

export { LandingPage };
