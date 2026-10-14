import {
  useEffect,
  useState,
} from "react";

import { motion } from "framer-motion";

import { api } from "../../api";
import Page from "../Page";
import StatusBadge from "../StatusBadge";

export default function MyApplications() {
  const [applications, setApplications] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const load = async () => {
    try {
      setLoading(true);

      const data = await api(
        "/applications/mine"
      );

      setApplications(data);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <Page>
      <div className="mb-8">
        <p className="text-sm font-bold uppercase tracking-wider text-blue-600">
          Career tracking
        </p>

        <h1 className="mt-2 text-4xl font-black">
          My Applications
        </h1>

        <p className="mt-2 text-slate-500">
          Track every opportunity you've
          applied for.
        </p>
      </div>

      {loading && (
        <div className="grid gap-5 md:grid-cols-2">
          {[1, 2].map((item) => (
            <div
              key={item}
              className="card h-48 animate-pulse"
            />
          ))}
        </div>
      )}

      {error && (
        <div className="rounded-2xl bg-red-500/10 p-5 font-bold text-red-600">
          {error}
        </div>
      )}

      {!loading &&
        !error &&
        applications.length === 0 && (
          <div className="card py-16 text-center">
            <div className="text-5xl">
              📭
            </div>

            <h2 className="mt-4 text-xl font-black">
              No applications yet
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Start exploring jobs and apply
              to your first opportunity.
            </p>
          </div>
        )}

      <div className="grid gap-5 md:grid-cols-2">
        {applications.map(
          (application, index) => (
            <motion.div
              key={application.id}
              initial={{
                opacity: 0,
                y: 20,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              transition={{
                delay: index * 0.08,
              }}
              className="card"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-blue-600">
                    {application.job?.type}
                  </p>

                  <h2 className="mt-1 text-xl font-black">
                    {application.job?.title}
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    {application.job?.company}
                  </p>
                </div>

                <StatusBadge
                  status={application.status}
                />
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl bg-slate-500/5 p-3">
                  <p className="text-xs text-slate-500">
                    Location
                  </p>

                  <p className="mt-1 font-bold">
                    📍 {application.job?.location}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-500/5 p-3">
                  <p className="text-xs text-slate-500">
                    Applied
                  </p>

                  <p className="mt-1 font-bold">
                    {new Date(
                      application.createdAt
                    ).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {application.coverNote && (
                <div className="mt-4 rounded-xl bg-blue-500/5 p-4">
                  <p className="text-xs font-bold text-blue-600">
                    Your cover note
                  </p>

                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    {application.coverNote}
                  </p>
                </div>
              )}
            </motion.div>
          )
        )}
      </div>
    </Page>
  );
}