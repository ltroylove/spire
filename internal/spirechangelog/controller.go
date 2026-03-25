package spirechangelog

import (
	"github.com/EQEmuTools/spire/internal/http/routes"
	"github.com/labstack/echo/v4"
	"net/http"
)

type Controller struct {
	service *Service
}

func NewController(service *Service) *Controller {
	return &Controller{service: service}
}

func (a *Controller) Routes() []*routes.Route {
	return []*routes.Route{
		routes.RegisterRoute(http.MethodGet, "spirechangelog", a.getState, nil),
		routes.RegisterRoute(http.MethodPost, "spirechangelog/draft", a.generateDraft, nil),
		routes.RegisterRoute(http.MethodPost, "spirechangelog/save", a.saveRelease, nil),
	}
}

func (a *Controller) getState(c echo.Context) error {
	state, err := a.service.LoadState()
	if err != nil {
		return c.JSON(http.StatusInternalServerError, echo.Map{"error": err.Error()})
	}

	return c.JSON(http.StatusOK, echo.Map{"data": state})
}

func (a *Controller) generateDraft(c echo.Context) error {
	draft, err := a.service.GenerateDraft()
	if err != nil {
		return c.JSON(http.StatusBadRequest, echo.Map{"error": err.Error()})
	}

	return c.JSON(http.StatusOK, echo.Map{"data": draft})
}

func (a *Controller) saveRelease(c echo.Context) error {
	var req SaveRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, echo.Map{"error": err.Error()})
	}

	state, err := a.service.SaveRelease(req)
	if err != nil {
		return c.JSON(http.StatusBadRequest, echo.Map{"error": err.Error()})
	}

	return c.JSON(http.StatusOK, echo.Map{
		"message": "Spire changelog saved successfully",
		"data":    state,
	})
}
