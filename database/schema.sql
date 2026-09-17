CREATE TABLE IF NOT EXISTS settings (id integer PRIMARY KEY CHECK(id=1), data jsonb NOT NULL);
CREATE TABLE IF NOT EXISTS users (
 id text PRIMARY KEY, name text NOT NULL, email text UNIQUE NOT NULL, cpf text UNIQUE NOT NULL,
 password text NOT NULL, role text NOT NULL CHECK(role IN ('master','secretaria','professor','preceptor','aluno','paciente')),
 course text NOT NULL DEFAULT '', period integer NOT NULL DEFAULT 1, registration text NOT NULL DEFAULT '',
 phone text NOT NULL DEFAULT '', birth text NOT NULL DEFAULT '', sex text NOT NULL DEFAULT '',
 approved boolean NOT NULL DEFAULT false, active boolean NOT NULL DEFAULT true,
 permissions jsonb NOT NULL DEFAULT '[]', subjects jsonb NOT NULL DEFAULT '[]', created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS sessions (token text PRIMARY KEY, user_id text NOT NULL REFERENCES users(id), expires timestamptz NOT NULL);
CREATE TABLE IF NOT EXISTS login_attempts (key text PRIMARY KEY, attempts integer NOT NULL, expires timestamptz NOT NULL);
CREATE TABLE IF NOT EXISTS resets (token text PRIMARY KEY, user_id text NOT NULL REFERENCES users(id), expires timestamptz NOT NULL);
CREATE TABLE IF NOT EXISTS rooms (id text PRIMARY KEY, name text NOT NULL, clinic text NOT NULL, area text NOT NULL, students integer NOT NULL CHECK(students>0), patients integer NOT NULL CHECK(patients>0), equipment integer NOT NULL CHECK(equipment>0), active boolean NOT NULL DEFAULT true);
CREATE TABLE IF NOT EXISTS availability (id text PRIMARY KEY, preceptor_id text NOT NULL REFERENCES users(id), room_id text NOT NULL REFERENCES rooms(id), weekday integer NOT NULL CHECK(weekday BETWEEN 0 AND 6), start_time text NOT NULL, end_time text NOT NULL, students integer NOT NULL CHECK(students>0), patients integer NOT NULL CHECK(patients>0));
CREATE TABLE IF NOT EXISTS classes (id text PRIMARY KEY, name text NOT NULL, course text NOT NULL, periods jsonb NOT NULL, prerequisites jsonb NOT NULL DEFAULT '[]', professor_id text REFERENCES users(id), availability_id text NOT NULL REFERENCES availability(id), start_date text NOT NULL, end_date text NOT NULL, duration integer NOT NULL CHECK(duration>0), semester text NOT NULL, active boolean NOT NULL DEFAULT true);
CREATE TABLE IF NOT EXISTS enrollments (id text PRIMARY KEY, class_id text NOT NULL REFERENCES classes(id), student_id text NOT NULL REFERENCES users(id), status text NOT NULL DEFAULT 'ativa', created_at timestamptz NOT NULL DEFAULT now(), ended_at timestamptz);
CREATE UNIQUE INDEX IF NOT EXISTS enrollment_active ON enrollments(class_id,student_id) WHERE status='ativa';
CREATE TABLE IF NOT EXISTS meetings (id text PRIMARY KEY, class_id text NOT NULL REFERENCES classes(id), day text NOT NULL, preceptor_id text NOT NULL REFERENCES users(id), room_id text NOT NULL REFERENCES rooms(id), status text NOT NULL DEFAULT 'aberto', reason text NOT NULL DEFAULT '', UNIQUE(class_id,day));
CREATE TABLE IF NOT EXISTS documents (id text PRIMARY KEY, student_id text NOT NULL REFERENCES users(id), kind text NOT NULL, filename text NOT NULL, mime text NOT NULL, content bytea NOT NULL, status text NOT NULL DEFAULT 'pendente', comment text NOT NULL DEFAULT '', reviewer_id text REFERENCES users(id), created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS bookings (id text PRIMARY KEY, meeting_id text NOT NULL REFERENCES meetings(id), owner_id text NOT NULL REFERENCES users(id), patient jsonb NOT NULL, slot text NOT NULL, status text NOT NULL DEFAULT 'agendado', reason text NOT NULL DEFAULT '', created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS reports (id text PRIMARY KEY, meeting_id text NOT NULL REFERENCES meetings(id), author_id text NOT NULL REFERENCES users(id), filename text NOT NULL, mime text NOT NULL, content bytea NOT NULL, late boolean NOT NULL DEFAULT false, comment text NOT NULL DEFAULT '', attendance jsonb NOT NULL DEFAULT '[]', attended_bookings jsonb NOT NULL DEFAULT '[]', created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(meeting_id,author_id));
CREATE TABLE IF NOT EXISTS attendance (meeting_id text NOT NULL REFERENCES meetings(id), student_id text NOT NULL REFERENCES users(id), status text NOT NULL CHECK(status IN ('presente','ausente')), confirmed_by text NOT NULL REFERENCES users(id), PRIMARY KEY(meeting_id,student_id));
CREATE TABLE IF NOT EXISTS transfers (id text PRIMARY KEY, student_id text NOT NULL REFERENCES users(id), from_class text NOT NULL REFERENCES classes(id), to_class text NOT NULL REFERENCES classes(id), status text NOT NULL DEFAULT 'solicitada', reason text NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS issues (id text PRIMARY KEY, author_id text NOT NULL REFERENCES users(id), room_id text REFERENCES rooms(id), subject text NOT NULL, body text NOT NULL, status text NOT NULL DEFAULT 'aberto', created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS messages (id text PRIMARY KEY, sender_id text NOT NULL REFERENCES users(id), recipient_id text NOT NULL REFERENCES users(id), subject text NOT NULL, body text NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS notices (id text PRIMARY KEY, user_id text NOT NULL REFERENCES users(id), subject text NOT NULL, body text NOT NULL, seen boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS outbox (id text PRIMARY KEY, user_id text NOT NULL REFERENCES users(id), subject text NOT NULL, body text NOT NULL, dedupe text UNIQUE, sent_at timestamptz, attempts integer NOT NULL DEFAULT 0, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS audit (id text PRIMARY KEY, user_id text REFERENCES users(id), action text NOT NULL, target text NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS bookings_meeting ON bookings(meeting_id,status);
CREATE INDEX IF NOT EXISTS notices_owner ON notices(user_id);
CREATE INDEX IF NOT EXISTS meetings_day ON meetings(day);
CREATE TABLE IF NOT EXISTS room_blocks (id text PRIMARY KEY,room_id text NOT NULL REFERENCES rooms(id),start_day text NOT NULL,end_day text NOT NULL,reason text NOT NULL);
CREATE TABLE IF NOT EXISTS absences (id text PRIMARY KEY,user_id text NOT NULL REFERENCES users(id),start_day text NOT NULL,end_day text NOT NULL);
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS student_limit integer;
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS patient_limit integer;
