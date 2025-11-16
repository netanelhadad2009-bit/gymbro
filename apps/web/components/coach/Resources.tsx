"use client";

type Resource = {
  id: string;
  title: string;
  type: "pdf" | "video" | "link";
  url: string;
};

type Props = {
  resources?: Resource[];
};

export function Resources({ resources = [] }: Props) {
  // Ensure resources is always an array
  const safeResources = Array.isArray(resources) ? resources : [];

  if (safeResources.length === 0) {
    return null; // Don't show if no resources
  }

  const getIcon = (type: Resource["type"]) => {
    switch (type) {
      case "pdf":
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        );
      case "video":
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case "link":
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
        );
    }
  };

  const getColor = (type: Resource["type"]) => {
    switch (type) {
      case "pdf":
        return { bg: "bg-red-500/10", text: "text-red-400" };
      case "video":
        return { bg: "bg-purple-500/10", text: "text-purple-400" };
      case "link":
        return { bg: "bg-blue-500/10", text: "text-blue-400" };
    }
  };

  return (
    <div className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-4" dir="rtl">
      <h3 className="text-base font-semibold text-white mb-3">משאבים מהמאמן</h3>

      <div className="space-y-2">
        {safeResources.map((resource) => {
          const colors = getColor(resource.type);

          return (
            <a
              key={resource.id}
              href={resource.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 bg-neutral-800 border border-neutral-700 rounded-xl hover:border-neutral-600 transition-colors active:translate-y-1 active:brightness-90"
            >
              <div className={`w-10 h-10 rounded-full ${colors.bg} flex items-center justify-center flex-shrink-0 ${colors.text}`}>
                {getIcon(resource.type)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-white truncate">{resource.title}</div>
                <div className="text-xs text-neutral-400 capitalize">{resource.type}</div>
              </div>

              <svg className="w-5 h-5 text-neutral-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          );
        })}
      </div>
    </div>
  );
}
