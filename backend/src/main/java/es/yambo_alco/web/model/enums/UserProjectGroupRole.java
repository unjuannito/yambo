package es.yambo_alco.web.model.enums;

public enum UserProjectGroupRole {
    MONITOR,
    COORDINATOR,
    PARENT;

    /** Monitors and coordinators are the staff; parents are not. */
    public boolean isStaff() {
        return this == MONITOR || this == COORDINATOR;
    }
}
