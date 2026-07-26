import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import styled, { css } from 'styled-components';
import { theme } from '../styles/theme';

const Header = styled.header`
  position: fixed;
  z-index: 1000;
  top: 0;
  right: 0;
  left: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 5.5rem;
  padding: 0 var(--page-gutter);
  color: ${({ $onLight, $scrolled }) =>
    $onLight && !$scrolled ? theme.colors.ink : theme.colors.white};
  transition:
    height 0.35s ${theme.easing.smooth},
    background 0.35s ease,
    border-color 0.35s ease;

  ${({ $scrolled }) =>
    $scrolled &&
    css`
      height: 4.6rem;
      border-bottom: 1px solid ${theme.colors.lineLight};
      background: rgba(9, 10, 9, 0.86);
      backdrop-filter: blur(18px);
    `}
`;

const Brand = styled(Link)`
  position: relative;
  z-index: 2;
  display: inline-flex;
  align-items: baseline;
  gap: 0.16em;
  min-height: 2.75rem;
  font: 400 1.55rem/2.75rem ${theme.fonts.display};
  letter-spacing: -0.04em;

  span {
    color: ${theme.colors.orange};
    font-style: italic;
  }
`;

const DesktopNav = styled.nav`
  display: flex;
  align-items: center;
  gap: clamp(1.3rem, 2.8vw, 3.2rem);

  a {
    position: relative;
    min-height: 2.75rem;
    font: 600 0.68rem/2.75rem ${theme.fonts.mono};
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }

  a::after {
    position: absolute;
    right: 0;
    bottom: 0.55rem;
    left: 0;
    height: 1px;
    background: ${theme.colors.orange};
    content: '';
    transform: scaleX(0);
    transform-origin: right;
    transition: transform 0.35s ${theme.easing.smooth};
  }

  a:hover::after,
  a.active::after {
    transform: scaleX(1);
    transform-origin: left;
  }

  @media (max-width: 48rem) {
    display: none;
  }
`;

const MenuButton = styled.button`
  position: relative;
  z-index: 2;
  display: none;
  width: 3rem;
  height: 3rem;
  padding: 0;
  border: 0;
  background: transparent;

  span,
  &::before {
    position: absolute;
    left: 0.55rem;
    width: 1.9rem;
    height: 1px;
    background: currentColor;
    content: '';
    transition: transform 0.35s ${theme.easing.smooth};
  }

  &::before {
    top: 1.14rem;
    transform: ${({ $open }) =>
      $open ? 'translateY(.35rem) rotate(45deg)' : 'none'};
  }

  span {
    bottom: 1.14rem;
    transform: ${({ $open }) =>
      $open ? 'translateY(-.35rem) rotate(-45deg)' : 'none'};
  }

  @media (max-width: 48rem) {
    display: block;
  }
`;

const MobilePanel = styled.div`
  position: fixed;
  z-index: 999;
  inset: 0;
  display: flex;
  visibility: ${({ $open }) => ($open ? 'visible' : 'hidden')};
  flex-direction: column;
  justify-content: flex-end;
  padding: 8rem var(--page-gutter) 3rem;
  background: ${theme.colors.orange};
  color: ${theme.colors.night};
  opacity: ${({ $open }) => ($open ? 1 : 0)};
  transition:
    opacity 0.35s ease,
    visibility 0.35s ease;

  nav {
    display: grid;
    border-top: 1px solid rgba(9, 10, 9, 0.35);
  }

  nav a {
    display: flex;
    align-items: center;
    justify-content: space-between;
    min-height: 5rem;
    border-bottom: 1px solid rgba(9, 10, 9, 0.35);
    font: 400 clamp(2.2rem, 12vw, 4.2rem)/1 ${theme.fonts.display};
  }

  nav a::after {
    content: '↗';
    font: 400 1rem/1 ${theme.fonts.mono};
  }

  small {
    margin-top: 2.5rem;
    font: 500 0.65rem/1.5 ${theme.fonts.mono};
    letter-spacing: 0.11em;
    text-transform: uppercase;
  }

  @media (min-width: 48.01rem) {
    display: none;
  }
`;

const navItems = [
  { to: '/work', label: 'Work' },
  { to: '/about', label: 'About' },
  { to: '/contact', label: 'Contact' },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const onLightBackground = ['/about', '/contact'].includes(location.pathname);

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 24);
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <>
      <Header $scrolled={scrolled || open} $onLight={onLightBackground}>
        <Brand to="/" aria-label="Julian Bjørgen – home">
          JULIAN <span>BJØRGEN</span>
        </Brand>
        <DesktopNav aria-label="Hovedmeny">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to}>
              {item.label}
            </NavLink>
          ))}
        </DesktopNav>
        <MenuButton
          type="button"
          $open={open}
          onClick={() => setOpen((current) => !current)}
          aria-expanded={open}
          aria-controls="mobile-navigation"
          aria-label={open ? 'Close menu' : 'Open menu'}
        >
          <span />
        </MenuButton>
      </Header>
      <MobilePanel $open={open} id="mobile-navigation" aria-hidden={!open}>
        <nav aria-label="Mobilmeny">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} tabIndex={open ? 0 : -1}>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <small>Julian Bjørgen · Photographer / Oslo, Norway</small>
      </MobilePanel>
    </>
  );
}
